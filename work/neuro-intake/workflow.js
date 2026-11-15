let shortcutsOpen = null;
let showOtherExams = false;
let entryTopic = null;

function hasClinicalData(value = record()) {
    return Boolean(value.freeHistory?.trim() ||
        Object.values(value.answers || {}).some(entry=>entry.state==='unknown'||entry.note?.trim()||entry.picks?.length||entry.amount) ||
        Object.values(value.exams || {}).some(exam=>['main','alt'].some(method=>exam[method]&&(exam[method].state!=='pending'||exam[method].note?.trim()||exam[method].picks?.length||Object.values(exam[method].grades||{}).some(grade=>grade!=='')))) ||
        Object.values(value.screening || {}).some(entry=>entry.value) ||
        Object.values(value.closing || {}).some(Boolean));
}

function selectedWorkflow() {
    return content.workflows?.[record().workflow] || null;
}

function allHistoryQuestions() {
    return [
        ...content.common,
        ...record().topics.flatMap(key => content.topics[key].questions),
        ...activeProfiles().flatMap(key => content.profiles[key].questions),
        ...(selectedWorkflow()?.followup ? content.followup : []),
        ...content.background
    ];
}

function workflowQuestions() {
    const workflow = selectedWorkflow();
    const all = allHistoryQuestions();
    if (!workflow) return all;
    const allowed = new Set(workflow.questionIds);
    // A second selected direction adds questions to the same encounter.
    for(const key of activeProfiles())if(key!==workflow.profile)for(const question of content.profiles[key].questions)allowed.add(question.id);
    for(const key of record().topics)if(key!==workflow.parent)for(const question of content.topics[key].questions)allowed.add(question.id);
    return all.filter(question => allowed.has(question.id) || question.section === 'followup');
}

function screeningValue(item) {
    return record().screening?.[item.id]?.value || '';
}


function recommendation() {
    const reasons = [];
    const screening = content.screening || [];
    for (const item of screening) {
        if (item.risk.includes(screeningValue(item))) reasons.push(item.label + '提示变化');
    }
    const texts = record().historyMode === 'free'
        ? [record().freeHistory || '']
        : questions().map(question => answerText(question));
    const warningTerms = ['突发剧烈头痛', '需两人扶持', '无法站立', '不能独立站立', '呼吸困难', '尿潴留', '意识改变', '持续混乱', '快速进展'];
    if (texts.some(text => positiveClue(text, warningTerms))) reasons.push('病史中存在需扩大评估的线索');
    const acute = texts.some(text => positiveClue(text, ['突然出现', '突然发作', '突发', '新发']));
    const focal = texts.some(text => positiveClue(text, ['无力', '偏瘫', '言语异常', '复视', '失语']));
    if (acute && focal) reasons.push('记录中同时出现急起与局灶症状线索');
    const followup = record().answers.followup_baseline;
    if (followup?.picks?.some(value => ['较前加重', '出现新症状'].includes(value))) reasons.push('复诊记录提示加重或新增症状');
    const incomplete = screening.filter(item => !screeningValue(item) || ['情况不详', '尚未充分询问'].includes(screeningValue(item)));
    return {
        reasons: [...new Set(reasons)],
        incomplete,
        suggestFull: reasons.length > 0 || (selectedWorkflow() && incomplete.length > 0)
    };
}

function screeningText(historyBody = '') {
    const negatives = {
        screen_change:'本次症状模式与既往无明显改变',
        screen_focal:'无新发单侧无力、言语异常、视力或视野变化及复视',
        screen_conscious:'无新发意识改变、明显混乱或发作后持续未恢复的情况',
        screen_headache:'无突发迅速达峰的剧烈头痛，亦无发热伴头痛及颈部症状',
        screen_progress:'无快速加重的无力、呼吸困难或新发明显吞咽障碍',
        screen_balance:'无新发持续眩晕，亦无新发不能独立坐、站或行走的情况'
    };
    return (content.screening || []).filter(item => {
        const value = screeningValue(item);
        return value && !['不适用于本次主诉', '情况不详', '尚未充分询问'].includes(value);
    }).map(item => {
        const entry = record().screening[item.id];
        if (entry.value === item.options[0]) {
            // Only omit the unchanged-pattern statement when the same fact is explicit.
            if(item.id === 'screen_change' && /本次模式相同|本次模式与(?:以往|既往)一致|本次症状模式与既往无明显改变/.test(historyBody) && !entry.note) return '';
            return negatives[item.id] + (entry.note ? '（' + entry.note + '）' : '');
        }
        return item.label + '，' + entry.value + (entry.note ? '（' + entry.note + '）' : '');
    }).filter(Boolean).join('；');
}

function entryPickerExpanded() {
    const selected=selectedWorkflow();
    return (!selected&&!hasClinicalData()) || (shortcutsOpen===null?!selected&&!Object.values(record().answers).some(entry=>entry.state!=='pending'):shortcutsOpen);
}

function shortcutPanel() {
    const selected = selectedWorkflow();
    const canCollapse=Boolean(selected||hasClinicalData());
    const expanded=entryPickerExpanded();
    const groupKey=entryTopic;
    const group=content.entryGroups.find(item=>item.key===groupKey);
    const toggle = canCollapse?'<button data-open-shortcuts>' + (expanded ? '收起入口' : '选择主要症状 / 追问方向') + '</button>':'';
    let body = '<section class="card shortcut-home"><div class="spread"><h3>按主要症状开始问诊</h3>' + toggle + '</div>';
    if(selected&&!expanded)body+='<p class="entry-current"><b>本次主要症状：'+h(content.entryGroups.find(item=>item.key===selected.parent)?.title||content.topics[selected.parent].title)+'</b><br>当前方向：'+h(selected.title)+'</p>';
    body += '<p class="why">先选主要症状，再选患者的表现。暂时拿不准，可先走通用问诊，再补充具体方向。</p>';
    if (expanded) {
        body+='<h4 class="entry-step"><span>1</span>选择主要症状</h4><div class="symptom-grid '+(group?'compact':'')+'" aria-label="主要症状分类">'+content.entryGroups.map(item=>
            '<button data-entry-topic="'+item.key+'" aria-pressed="'+(groupKey===item.key)+'" class="'+(groupKey===item.key?'entry-active':'')+'"><b>'+h(item.title)+'</b><small>'+h(item.description)+'</small></button>').join('')+'</div>';
        if(group){
            const sameEncounter=record().topics.includes(group.key)&&hasClinicalData();
            const newEncounter=hasClinicalData()&&!record().topics.includes(group.key);
            body+='<div id="entry-directions"><div class="spread"><h4 class="entry-step"><span>2</span>'+h(group.title)+'：选择表现或追问方向</h4><button class="textbtn" data-entry-back>重新选主要症状</button></div>'+
                '<p class="why">'+(sameEncounter?'同一主要症状下，可继续加入追问方向；已经填写的病史和查体保留。':newEncounter?'当前接诊已有其他主要症状的记录，下面的选择将开始一份新接诊；原记录保留在左侧。':'选择后开始本次接诊，不预填症状、诊断或正常查体。')+'</p>'+
                '<div class="entry-branches">'+group.branches.map(branch=>{
                    const joined=selected?.parent===group.key&&(branch.profile?record().profiles.includes(branch.profile):record().workflow===branch.route);
                    return '<button data-enter-route="'+branch.route+'" class="'+(branch.general?'entry-general ':'')+(joined?'entry-joined':'')+'"><b>'+h(branch.title)+'</b><small>'+h(branch.note)+'</small><span class="entry-action">'+(joined?'已加入 · 继续问诊':newEncounter?'开始新接诊 →':sameEncounter?'加入本次问诊 →':'开始问诊 →')+'</span></button>';
                }).join('')+'</div></div>';
        }else body+='<p class="entry-empty">选择上面的主要症状，查看对应的问诊方向。</p>';
    }
    if(selected&&activeProfiles().length>1)body+='<p class="why">本次已加入追问：'+h(activeProfiles().map(key=>content.profiles[key].title).join('、'))+'</p>';
    body += '<details class="simulation-entry"><summary>虚构病例演练（仅供演示）</summary><p class="why">上方是问诊入口；下方是预设或空白的虚构演练病例。</p><div class="shortcut-grid">' +
        (content.simulations || []).map(sample => '<button data-load-simulation="' + sample.key + '">' + h(sample.title) + '</button>').join('') + '</div></details>';
    if (record().simulation) body += '<p class="scope-note">'+(content.simulations.find(sample=>sample.key===record().simulation)?.blank?'当前是虚构演练病例，病史、警示症状与查体所见均由你逐项录入。':'当前是虚构演练病例，预设病史可核对修改，查体结果由你逐项录入。')+'</p>';
    return body + '</section>';
}

function screeningCards() {
    const rec = recommendation();
    return '<section class="card"><h2>先核对本次变化</h2><p class="why">每项按实际问到的情况点选。尚未确认的内容保留待补，选择病种本身不会确认诊断。</p>' +
        content.screening.map(item => {
            const entry = record().screening?.[item.id] || {};
            const positive = item.risk.includes(entry.value);
            return '<article class="screening-row" id="' + item.id + '"><h3>' + h(item.label) + '</h3><p>' + h(item.ask) + '</p><div class="chips">' +
                item.options.map((option,index) => chip(option, 'data-screening="' + item.id + '" data-option="' + index + '"', entry.value === option)).join('') +
                '</div>' + (positive ? '<textarea data-screening-note="' + item.id + '" placeholder="请补充具体症状、时间与侧别">' + h(entry.note || '') + '</textarea>' : '') + '</article>';
        }).join('') + '<button class="primary next" data-section="route">进入症状问诊 →</button></section>';
}

function plannedExams() {
    const workflow = selectedWorkflow();
    const labels = new Set(['生命体征','一般观察与配合','意识与定向','构音', ...(workflow?.exams || []), ...priorities().keys()]);
    return content.exams.filter(exam => labels.has(exam.label));
}

function visibleExams() {
    return record().examMode === 'focused' && !showOtherExams ? plannedExams() : content.exams;
}

function visibleExamGroups() {
    return [...new Set(visibleExams().map(exam => exam.group))];
}

function coverage() {
    const recorded = content.exams.filter(exam => !['pending','unable'].includes(examValue(exam).state) && examText(exam));
    const unable = content.exams.filter(exam => examValue(exam).state === 'unable');
    const partial = recorded.filter(exam => !examComplete(exam));
    return {recorded, partial, unable, unrecorded: content.exams.length - recorded.length - unable.length};
}

function examComplete(exam) {
    const value = examValue(exam);
    if (['pending','unable','notdone'].includes(value.state) || !examText(exam)) return false;
    const method = record().exams[exam.id]?.method || 'main';
    if (method === 'main' && ['上肢肌力','下肢肌力'].includes(exam.label)) {
        const muscles = exam.label === '上肢肌力' ? ['肩外展','肘屈','肘伸','腕背伸','指外展'] : ['髋屈','膝伸','膝屈','踝背伸','跖屈'];
        return ['左','右'].every(side => muscles.every(muscle => value.grades?.[side + muscle] !== undefined && value.grades[side + muscle] !== ''));
    }
    if (['肱二头肌反射','肱三头肌反射','桡骨膜反射','膝反射','跟腱反射'].includes(exam.label)) {
        return ['左','右'].every(side => value.picks.some(pick => pick.startsWith(side)));
    }
    return true;
}

function examScopeText() {
    const result = coverage();
    const mode = record().examMode === 'focused' ? '本次采用关键项目查体' : '本次按全面查体清单记录';
    const focusProgress = record().examMode === 'focused' ? '，关键清单' + plannedExams().filter(examComplete).length + '/' + plannedExams().length + '项已完整记录' : '';
    return mode + focusProgress + '，本次共已完整记录' + (result.recorded.length - result.partial.length) + '项' +
        (result.partial.length ? '，' + result.partial.length + '项部分记录' : '') +
        (result.unable.length ? '，' + result.unable.length + '项无法评估' : '') +
        '，' + result.unrecorded + '项未查或未记录。';
}

function generatedExamDocument() {
    const incomplete=missingExams().length>0;
    const scope=incomplete?(record().examMode==='focused'?'本次为针对性查体，未查或未记录项目待补。':'以上为本次已记录所见，未查或未记录项目待补。'):'';
    return [examSummary().replace(/[。；;]*$/, '。').replace(/^。$/, ''),scope].filter(Boolean).join('\n');
}
function examDocument() {
    return reviewedNote('exam',generatedExamDocument());
}

function examModePanel() {
    const rec = recommendation();
    const focused = record().examMode === 'focused';
    const reasons = rec.reasons.length ? rec.reasons.join('；') : rec.incomplete.length ? '变化核对尚有' + rec.incomplete.length + '项待确认' : '可按当前病史和临床判断选择范围';
    const notice = '<p class="why">按实际检查点选，病史相关的重点标黄。</p>'+(rec.suggestFull?'<details><summary>查看范围提示</summary><p class="why">'+h(reasons)+'</p></details>':'');
    return '<section class="card"><div class="spread"><h3>查体范围</h3><div class="chips">' +
        chip('全面查体', 'data-exam-mode="full"', !focused) + (selectedWorkflow()?.comprehensive?'':chip('关键项目', 'data-exam-mode="focused"', focused)) +
        '</div></div>' + notice + '<p class="why">' + h(examScopeText()) + '</p>' +
        (focused ? '<button data-show-other>' + (showOtherExams ? '收起其余项目' : '展开其余项目，随时补查') + '</button>' : '') +
        '<details><summary>查看计划内项目和检查范围</summary><p>' + h((focused ? plannedExams() : content.exams).map(exam => exam.label).join('、')) + '</p><p class="why">全面清单包括按指征选择的专项检查。无法完成或无指征时记录实际情况，不能确认正常。</p></details></section>';
}

function quickExaminationAction(exam) {
    if ((record().exams[exam.id]?.method || 'main') !== 'main') return '';
    const muscle = ['上肢肌力','下肢肌力'].includes(exam.label);
    if (muscle) return '<button class="exam-confirm" data-confirm-exam="' + exam.id + '">已查所列双侧肌群，均Ⅴ级</button>';
    const selections = {
        '意识与定向': ['人物定向准确','地点定向准确','时间定向准确'],
        '面肌 VII': ['动作对称'],
        '眼位与眼球运动 III、IV、VI': ['双眼各向活动充分'],
        '指鼻试验': ['左侧准确','右侧准确'],
        '跟膝胫试验': ['左侧准确','右侧准确'],
        '肱二头肌反射': ['左2+','右2+'],
        '肱三头肌反射': ['左2+','右2+'],
        '桡骨膜反射': ['左2+','右2+'],
        '膝反射': ['左2+','右2+'],
        '跟腱反射': ['左2+','右2+']
    };
    if (!selections[exam.label]) return '';
    return '<button class="exam-confirm" data-confirm-exam="' + exam.id + '" data-picks="' + h(JSON.stringify(selections[exam.label])) + '">已查并确认：' + h(selections[exam.label].join('、')) + '</button>';
}

function completeKeyExams() {
    return plannedExams().filter(exam => !examComplete(exam));
}

function startWorkflow(key) {
    const workflow = content.workflows[key];
    if (!workflow) return;
    newEncounter();
    Object.assign(record(), {
        workflow: key, topics: [workflow.parent], profiles: workflow.profile?[workflow.profile]:[],
        title: workflow.title + ' ' + new Date().toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}),
        examMode: 'full', historyMode: 'guided', screening: {}
    });
    section = 'screening'; shortcutsOpen = false; showOtherExams = false;
    save(); page(); scrollPageTop();
}

function startEntryRoute(key) {
    const workflow=content.workflows[key];
    if(!workflow)return;
    const hadData=hasClinicalData();
    const sameSymptom=record().topics.includes(workflow.parent);
    if(hadData&&!sameSymptom)newEncounter();
    const value=record();
    const continuing=hadData&&sameSymptom;
    const changed=value.workflow!==key;
    value.workflow=key;
    value.topics=continuing?[...new Set([workflow.parent,...value.topics])]:[workflow.parent];
    value.profiles=[...new Set([...(continuing?value.profiles:[]),...(workflow.profile?[workflow.profile]:[])])];
    value.answers ||= {};value.exams ||= {};value.screening ||= {};
    value.historyMode ||= 'guided';
    if(changed||!value.examMode)value.examMode='full';
    if(!value.simulation&&!continuing)value.title=(content.entryGroups.find(item=>item.key===workflow.parent)?.title||workflow.title)+' · 接诊 '+new Date().toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
    stage='问诊';section='screening';entryTopic=workflow.parent;shortcutsOpen=false;showOtherExams=false;
    save();page();scrollPageTop();
}

function workflowClick(button) {
    const data = button.dataset;
    if(data.entryTopic){entryTopic=data.entryTopic;shortcutsOpen=true;page();jump('entry-directions');return true;}
    if(button.hasAttribute('data-entry-back')){entryTopic=null;shortcutsOpen=true;page();scrollPageTop();return true;}
    if(data.enterRoute){startEntryRoute(data.enterRoute);return true;}
    if (button.hasAttribute('data-open-shortcuts')) {
        const expanded=shortcutsOpen===null?!selectedWorkflow()&&!Object.values(record().answers).some(entry=>entry.state!=='pending'):shortcutsOpen;
        shortcutsOpen = !expanded;if(shortcutsOpen)entryTopic=selectedWorkflow()?.parent||null;page();return true;
    }
    if (data.startWorkflow) {
        startWorkflow(data.startWorkflow); return true;
    }
    if (data.loadSimulation) {
        const sample = content.simulations.find(item => item.key === data.loadSimulation);
        if (!sample) return true;
        startWorkflow(sample.workflow);
        record().simulation = sample.key;
        record().title = '虚构演练 · ' + sample.title;
        for (const [id,note] of Object.entries(sample.notes)) record().answers[id] = {state:'record',picks:[],note};
        if (sample.blank) {
            record().screening={};
            record().examMode='full';
        } else if (sample.risk) {
            const item = content.screening.find(item => item.id === sample.risk);
            record().screening[item.id] = {value:item.risk[0],note:sample.riskNote};
            record().examMode = 'full';
        } else {
            for (const item of content.screening) record().screening[item.id] = {value:item.options[0],note:''};
            record().examMode = 'focused';
        }
        save(); page(); return true;
    }
    if (data.screening) {
        const item = content.screening.find(row => row.id === data.screening);
        record().screening ||= {};
        const value = item.options[Number(data.option)];
        const previous = record().screening[item.id] || {};
        record().screening[item.id] = {value, note: item.risk.includes(value) ? previous.note || '' : ''};
        if (item.risk.includes(value) && record().examMode === 'focused') {
            record().examMode = 'full'; showOtherExams = false;
            toast('新增变化线索，已切回全面清单');
        }
        changed(); jump(item.id); return true;
    }
    if (data.examMode) {
        record().examMode = data.examMode; showOtherExams = false;
        const groups = visibleExamGroups();
        if (!groups.includes(examGroup)) examGroup = groups[0];
        changed(); scrollPageTop(); return true;
    }
    if (button.hasAttribute('data-show-other')) { showOtherExams = !showOtherExams; page(); return true; }
    if (data.confirmExam) {
        const exam = content.exams.find(item => item.id === data.confirmExam);
        if (!exam) return true;
        const entry = examSaved(exam.id);
        resumeExamination(entry);
        const hasResult = entry.note || entry.picks.length || Object.values(entry.grades).some(Boolean);
        if (hasResult && !window.confirm('此项已有记录。确认已重新检查，并用本次所见替换原结果？')) return true;
        entry.picks = data.picks ? JSON.parse(data.picks) : [];
        entry.grades = {};
        entry.note = '';
        if (['上肢肌力','下肢肌力'].includes(exam.label)) {
            const muscles = exam.label === '上肢肌力' ? ['肩外展','肘屈','肘伸','腕背伸','指外展'] : ['髋屈','膝伸','膝屈','踝背伸','跖屈'];
            for (const side of ['左','右']) for (const muscle of muscles) entry.grades[side + muscle] = '5';
        }
        entry.state = 'record'; changed(); jump(exam.id); return true;
    }
    return false;
}

