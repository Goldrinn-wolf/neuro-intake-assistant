const CLOSING_FIELDS = [
    {key:'course',label:'就诊时的症状变化',options:['症状持续不缓解','症状反复发作','症状较前加重','症状较前缓解','症状已缓解']},
    {key:'visit',label:'来院就诊经过',options:['遂来我院就诊','遂至我院门诊就诊','遂至我院急诊就诊']},
    {key:'admission',label:'是否收住院',options:['门诊收住入院','急诊收住入院','未收住院']},
    {key:'spirit',label:'精神',options:['可','欠佳','萎靡','烦躁','情况不详']},
    {key:'sleep',label:'夜休',options:['可','欠佳','入睡困难','易醒','早醒','睡眠增多','情况不详']},
    {key:'appetite',label:'食欲（可选）',options:['可','减退','亢进','情况不详']},
    {key:'bowel',label:'大便',options:['如常','便秘','腹泻','失禁','情况不详']},
    {key:'urine',label:'小便',options:['如常','尿频','排尿困难','尿潴留','失禁','情况不详']}
];

function closingState() {
    return record().closing || {};
}

function admissionSelected() {
    return ['门诊收住入院','急诊收住入院'].includes(closingState().admission);
}

function closingDiagnosis() {
    return String(closingState().diagnosis || '').trim().replace(/^[“"]|[”"]$/g, '').replace(/\s*\n\s*/g, ' ');
}

function closingWarnings() {
    const state = closingState();
    const warnings = [];
    if (admissionSelected() && !closingDiagnosis()) warnings.push('收住诊断留空时，入院句暂不生成，其余内容可正常复制。');
    const answers = questions().map(question => answerText(question)).join('，');
    if (state.course === '症状持续不缓解' && /静止后缓解|静卧时不晕|静止时无眩晕|静止时不晕/.test(answers)) {
        warnings.push('病史记有静止或静卧时缓解，请核对“持续不缓解”是否确切；可按实际情况选择“症状反复发作”。');
    }
    if (record().answers.common_11?.note && ['spirit','sleep','appetite','bowel','urine'].some(key => state[key])) {
        warnings.push('原“一般情况”已有文字，请核对它与本页选择是否一致。');
    }
    return warnings;
}

function closingText() {
    const state = closingState();
    const paragraphs = [];
    const visit = [state.course,state.visit].filter(Boolean).join('，');
    if (visit) paragraphs.push(sentence(visit));
    if (admissionSelected() && closingDiagnosis()) {
        paragraphs.push(sentence((state.admission === '门诊收住入院' ? '门诊' : '急诊') + '以“' + closingDiagnosis() + '”收住入院'));
    } else if (state.admission === '未收住院') paragraphs.push('本次未收住院。');
    const general = [];
    if (state.spirit) general.push(state.spirit === '情况不详' ? '精神情况不详' : '精神' + state.spirit);
    if (state.sleep) {
        const sleep = {可:'夜休可',欠佳:'夜休欠佳',入睡困难:'入睡困难',易醒:'夜间易醒',早醒:'早醒',睡眠增多:'睡眠增多',情况不详:'夜休情况不详'};
        general.push(sleep[state.sleep]);
    }
    if (state.appetite) general.push(state.appetite === '情况不详' ? '食欲情况不详' : '食欲' + state.appetite);
    if (state.bowel === '如常' && state.urine === '如常') {
        general.push('大小便如常');
    } else {
        if (state.bowel) {
            const bowel = {如常:'大便如常',便秘:'有便秘',腹泻:'有腹泻',失禁:'大便失禁',情况不详:'大便情况不详'};
            general.push(bowel[state.bowel]);
        }
        if (state.urine) {
            const urine = {如常:'小便如常',尿频:'有尿频',排尿困难:'排尿困难',尿潴留:'有尿潴留',失禁:'小便失禁',情况不详:'小便情况不详'};
            general.push(urine[state.urine]);
        }
    }
    if (state.generalNote?.trim()) general.push(state.generalNote.trim());
    if (general.length) paragraphs.push(sentence('发病以来，' + general.filter(Boolean).join('，')));
    return paragraphs.join('');
}

function closingPanel() {
    const state = closingState();
    return '<section class="card"><h2>就诊结尾与发病以来的一般情况</h2><p class="why">按本次事实逐项选择，未选择的内容不进入病历。诊断填写当时的收住诊断。</p>' +
        '<div id="closing-warnings" role="status"></div>' +
        CLOSING_FIELDS.map(field => '<article class="closing-row"><div class="spread"><h3>' + h(field.label) + '</h3><button data-clear-closing="' + field.key + '">本项不写</button></div><div class="chips">' +
            field.options.map((option,index) => chip(option,'data-closing-key="' + field.key + '" data-option="' + index + '"',state[field.key] === option)).join('') +
            '</div>' + (field.key === 'admission' ? '<label class="lab">收住诊断<input id="admission-diagnosis" data-closing-text="diagnosis" maxlength="120" placeholder="例如：眩晕待查" value="' + h(state.diagnosis || '') + '" '+(admissionSelected()?'':'disabled')+'></label>' : '') +
            '</article>').join('') +
        '<label class="lab">其他一般情况补充（可选）<textarea data-closing-text="generalNote" maxlength="600" placeholder="仅补充实际问到的情况">' + h(state.generalNote || '') + '</textarea></label><div class="actions"><button class="primary" data-stage="查体">继续查体 →</button><button data-stage="病历预览">查看生成病历</button></div></section>';
}

function refreshClosingWarnings() {
    const element = document.querySelector('#closing-warnings');
    if (element) element.innerHTML = closingWarnings().map(message => '<p class="closing-warning">' + h(message) + '</p>').join('');
}

function closingInput(field) {
    const key = field.dataset.closingText;
    if (!key) return false;
    record().closing ||= {};
    record().closing[key] = field.value;
    save();
    return true;
}

function closingClick(button) {
    const key = button.dataset.closingKey;
    if (key) {
        const field = CLOSING_FIELDS.find(field => field.key === key);
        const option = field?.options[Number(button.dataset.option)];
        if (!option) return true;
        record().closing ||= {};
        record().closing[key] = record().closing[key] === option ? '' : option;
        changed();
        return true;
    }
    if (button.dataset.clearClosing) {
        record().closing ||= {};
        delete record().closing[button.dataset.clearClosing];
        changed();
        return true;
    }
    return false;
}

function closingReadyToCopy() {
    return true;
}

