function sentence(text) {
    const value = String(text || '').trim().replace(/[。；;]+$/g, '');
    return value ? value + '。' : '';
}

function clinicalAnswer(question) {
    const entry = record().answers[question.id];
    if (!entry || entry.state === 'pending') return '';
    if (entry.state === 'unknown') return question.id === 'common_5' ? '每次持续时间不详' : question.label.replace(/（.*?）/g,'') + '不详';
    const picks = entry.picks || [];
    if (picks.includes('以上均否认')) {
        const symptoms = question.options.filter(value => !['以上均否认','情况不详'].includes(value));
        return '否认' + symptoms.join('、') + (entry.note ? '，' + entry.note.trim() : '');
    }
    return speechText(answerText(question));
}

function historySentence(question) {
    const value = clinicalAnswer(question);
    if (!value) return '';
    const entry = record().answers[question.id];
    if (entry.state === 'unknown' || value.startsWith('否认')) return value;
    const onlyNote = entry.note?.trim() && !entry.picks?.length && !entry.amount;
    if(entry.picks?.length===1&&entry.picks[0]==='情况不详')return question.label.replace(/（.*?）/g,'')+'不详';
    if(question.id==='current_onset')return recurrenceSentence(value);
    const templates = {
        common_0: () => /诉|虚构|已确诊|岁/.test(value) ? value : '诉' + value,
        common_1: () => /出现|起病|发作|发现|病程/.test(value) ? value.replace(/^本次(?=今日|昨日|今晨|昨晚)/,'') : '起病时间为' + value,
        common_2: () => ({'突然出现':'起病突然','逐渐出现':'起病较缓','数分钟逐渐出现':'症状于数分钟内逐渐出现','数小时加重':'症状于数小时内加重','数天逐渐出现':'症状于数天内逐渐出现','缓慢进展':'症状缓慢进展','记不清':'起病方式不详'}[value] || value),
        common_4: () => ({'持续存在':'症状持续存在','反复发作':'症状反复发作','逐渐加重':'症状逐渐加重','逐渐减轻':'症状逐渐减轻','症状波动':'症状呈波动性','已恢复':'目前症状已恢复'}[value] || value),
        common_5: () => /每次|每月|每周|每日|分钟|小时/.test(value) ? value.replace(/([\d.]+)(秒|分钟|小时|天)\/次/g,'每次持续$1$2') : '单次持续及频率为' + value,
        common_6: () => value,
        common_8: () => value === '首次发生' ? '既往无同类发作' : value,
        common_9: () => value,
        common_10: () => value,
        common_11: () => value,
        dizzy_0: () => '头晕表现为' + value,
        dizzy_4: () => functionalHistoryText(value,true),
        migraine_2: () => value === '未发生先兆' ? '本次未出现先兆' : value,
        followup_baseline: () => value === '与上次相似' ? '与上次就诊相比症状相似' : value,
        followup_medication: () => value,
        followup_adverse: () => value
    };
    if (templates[question.id]) return templates[question.id]();
    if(entry.picks?.length || (question.id==='headache_1'&&entry.amount!==undefined&&entry.amount!=='')) {
        return [formatStoryPicks(question,entry),question.id==='headache_1'?'':entry.amount?entry.amount+(entry.unit||''):'',entry.note?.trim()].filter(Boolean).join('，');
    }
    if(question.id==='headache_0'&&onlyNote&&!/头痛/.test(value))return '头痛呈'+value;
    if (onlyNote) return value;
    return value;
}

function headacheAssociated(byId) {
    const positive=new Set(),negative=new Set(),notes=[],consumed=new Set();
    for(const id of ['headache_3','migraine_1']) {
        const question=byId.get(id),entry=record().answers[id];
        if(!question||!entry||entry.state==='pending')continue;
        consumed.add(id);
        if(entry.state==='unknown'){notes.push(clinicalAnswer(question));continue;}
        if(entry.picks.includes('以上均否认'))question.options.filter(text=>!['以上均否认','情况不详'].includes(text)).forEach(text=>negative.add(text));
        else entry.picks.filter(text=>text!=='情况不详').forEach(text=>positive.add(text));
        if(entry.picks.includes('情况不详'))notes.push(question.label.replace(/（.*?）/g,'')+'不详');
        if(entry.note?.trim()) {
            const parts=entry.note.trim().replace(/^伴/,'').split(/[、，,]/);
            if(parts.length&&parts.every(text=>['恶心','呕吐','畏光','畏声','发热','颈痛'].includes(text)))parts.forEach(text=>positive.add(text));
            else notes.push(speechText(entry.note));
        }
    }
    return {consumed,sentences:[positive.size?'伴'+[...positive].join('、'):'',negative.size?'否认'+[...negative].join('、'):'',...notes].filter(Boolean)};
}

function naturalHistoryText() {
    if (record().historyMode === 'free') return [record().freeHistory?.trim(),closingText()].filter(Boolean).join('\n') || '填写快捷草稿后，这里显示现病史。';
    const activeQuestions=questions().filter(question=>question.section!=='background');
    const byId=new Map(activeQuestions.map(question=>[question.id,question]));
    const vertigo=vertigoHistoryParts(byId);
    const opening=historyOpening(byId,vertigo);
    const chief=opening.text;
    const groups=Array.from({length:11},()=>[]);
    if(chief)groups[0].push(chief);
    if(vertigo)for(const text of vertigo.sentences) {
        if(opening.usedTrigger&&text===opening.usedTrigger)continue;
        groups[/^发作(?:期间|间歇期)诉/.test(text)?7:2].push(text);
    }
    if(opening.context)groups[5].push(opening.context);
    if(opening.recurrence&&!clinicalAnswer(byId.get('current_onset')||{id:'current_onset'}))groups[1].push(recurrenceSentence(opening.recurrence));
    const associated=headacheAssociated(byId);
    groups[4].push(...associated.sentences);
    for(const question of activeQuestions){
        if(question.id==='common_0'||opening.consumed.has(question.id)||vertigo?.consumed.has(question.id)||associated.consumed.has(question.id))continue;
        const value=clinicalAnswer(question);
        if(!value)continue;
        const duration=value.match(/[\d一二三四五六七八九十两]+(?:至[\d一二三四五六七八九十两]+)?(?:秒|分钟|小时|天|周|个月|年)/)?.[0];
        if(question.id==='common_1'&&duration&&chief.includes(duration)&&/^(?:本轮|本次)?[\d一二三四五六七八九十两]+(?:至[\d一二三四五六七八九十两]+)?(?:秒|分钟|小时|天|周|个月|年)(?:前)?(?:出现|发作)?$/.test(value))continue;
        if(question.id==='common_4'&&['反复发作','反复短暂发作'].includes(value)&&chief.includes('反复'))continue;
        if(question.id==='common_8'&&value==='既往有类似发作'&&chief.includes('反复'))continue;
        if(question.id==='common_2'&&value==='改变头位后突然开始'&&vertigo?.values.trigger)continue;
        if(question.id==='dizzy_0'&&['周围旋转','周围景物旋转'].includes(value)&&chief.includes('旋转'))continue;
        let text=historySentence(question);
        if(question.id==='common_6'&&opening.usedTrigger)text=text.split(/[，,。；;]/).filter(clause=>clause!==opening.usedTrigger).join('，');
        groups[storyGroup(question)].push(text);
    }
    for(const index of [1,3])if(groups[index].length)groups[index]=[groups[index].filter(Boolean).join('，')];
    const unique = [...new Set(groups.flat().filter(Boolean).map(text => text.replace(/[。]+$/g, '')))];
    const paragraphs = [];
    const screened = screeningText(unique.join('。'));
    // Screening belongs with associated symptoms, before the visit/treatment account.
    if(screened)groups[8].push(screened);
    const rendered=new Set();
    for(const group of [groups.slice(0,5).flat(),groups.slice(5,9).flat(),groups.slice(9).flat()]) {
        const text=group.filter(Boolean).filter(text=>{const key=text.replace(/[。]+$/g,'');if(rendered.has(key))return false;rendered.add(key);return true;}).map(sentence).join('');
        if(text)paragraphs.push(text);
    }
    if (closingText()) paragraphs.push(closingText());
    return paragraphs.join('\n') || '填写问诊后，这里生成现病史。';
}

function sourceNote(kind) {
    if (kind === 'history') return naturalHistoryText();
    if (kind === 'exam') return generatedExamDocument();
    return backgroundText();
}

function reviewedNote(kind, generated) {
    const edited = record().finalNotes?.[kind];
    return edited && edited.source === generated && typeof edited.text === 'string' ? edited.text : generated;
}

function reviewStatus(kind) {
    const edited = record().finalNotes?.[kind];
    const warnings=kind==='history'?closingWarnings().join(' '):'';
    if (!edited) return '按当前记录生成，可核对后修改措辞。'+warnings;
    return edited.source === sourceNote(kind)
        ? '已保存核对稿，复制将采用当前文字。'
        : '原记录已变化，旧手改稿已停用，当前采用最新生成稿，请重新核对。';
}

function reviewPanel(kind, title, id) {
    const edited = record().finalNotes?.[kind];
    const stale = edited && edited.source !== sourceNote(kind);
    const preview = reviewedNote(kind, sourceNote(kind));
    return '<section class="card review-card"><div class="spread"><h2>' + h(title) + '</h2><button class="primary" data-copy="' + kind + '">复制' + h(title) + '</button></div>' +
        '<p class="why" id="review-status-' + kind + '">' + h(reviewStatus(kind)) + '</p>' +
        '<textarea id="' + id + '" class="review-note" data-review-note="' + kind + '">' + h(preview) + '</textarea>' +
        (edited ? '<button class="textbtn" data-reset-review="' + kind + '">恢复自动生成稿</button>' : '') +
        (stale ? '<details><summary>查看原记录更新前的手改稿</summary><p class="prose">' + h(edited.text) + '</p></details>' : '') +
        (kind === 'exam' ? '<details><summary>实际查体范围</summary><p id="examScope">' + h(examScopeText()) + '</p></details>' : '') + '</section>';
}

function reviewInput(field) {
    const kind = field.dataset.reviewNote;
    if (!kind) return false;
    record().finalNotes ||= {};
    record().finalNotes[kind] = {source:sourceNote(kind), text:field.value};
    save();
    return true;
}

function reviewClick(button) {
    if (!button.dataset.resetReview) return false;
    delete record().finalNotes[button.dataset.resetReview];
    save(); page();
    return true;
}

