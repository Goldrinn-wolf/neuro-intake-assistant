function speechText(text) {
    return String(text || '').trim().replace(/患者(?:自述|自诉|诉)|自述|自诉/g, '诉');
}

function parseHistoryTime(value) {
    const duration='[\\d一二三四五六七八九十百两半]+(?:\\.\\d+)?(?:秒|分钟|小时|天|周|个月|年)';
    const day='(?:今日|昨日|前日|今晨|昨晚|今晚)(?:(?:上午|中午|午后|下午|傍晚|晚上|早餐时|晨起)|\\d{1,2}[:：]\\d{2})?';
    const match=String(value||'').trim().match(new RegExp('^(?:(?:本轮|本次|首次)(?:头痛|眩晕|症状|于)*)?(近?'+duration+'前?|'+day+')(出现|发作|起病|首次发现|发现)?$'));
    if (!match) return null;
    let text=match[1].replace(/^近/,'');
    if(new RegExp('^'+duration+'$').test(text)) text+='前';
    return {text,verb:/发现/.test(match[2]||'')?match[2]:'出现'};
}

function compactChief(questionsById) {
    let value = clinicalAnswer(questionsById.get('common_0') || {id:'common_0',label:'主要不适'});
    value = value.replace(/^虚构(?:教学)?病例[。．，,]?\s*/, '');
    const age = value.match(/^(\d+岁)[，,]\s*/);
    if (age) value = value.slice(age[0].length);
    const otherValues = [...questionsById.values()].filter(question => question.id !== 'common_0').flatMap(question => clinicalAnswer(question).split(/[，,。；;]/).map(text=>text.trim()));
    const clauses = value.split(/[，,]/).filter(Boolean).filter(clause => clause.length < 6 || !otherValues.includes(clause.trim()));
    value = clauses.join('，').replace(/^本轮/, '');
    if (value && !/^诉|^已确诊/.test(value)) value = '诉' + value;
    return value;
}

function historyOpening(questionsById, vertigo) {
    let chief = compactChief(questionsById).replace(/^诉/, '');
    const consumed = new Set();
    if (!chief) return {text:'',consumed};
    const duration = '[\\d一二三四五六七八九十百两半]+(?:小时|天|周|个月|年)';
    const timeValue = questionsById.has('common_1') ? clinicalAnswer(questionsById.get('common_1')) : '';
    const parsedTime=parseHistoryTime(timeValue);
    const explicitTime = timeValue.match(new RegExp('^(?:(?:本轮|本次)(?:于)?)?(' + duration + '前|今日|昨日|今晨|昨晚)(?:出现|发作|起病)?$'));
    const simpleDuration = timeValue.match(new RegExp('^(?:近)?(' + duration + ')$'));
    let onset = parsedTime?.text || explicitTime?.[1] || (simpleDuration ? simpleDuration[1] + '前' : '');
    let legacyContext='',recurrence='';
    const legacy=chief.match(new RegExp('^(既往诊断[^，]+)，近('+duration+')反复发作(?:，(.*))?$'));
    if(legacy&&record().topics.includes('headache')&&chief.includes('头痛')) {
        chief='反复头痛';
        legacyContext=[legacy[1],legacy[3]].filter(Boolean).join('，');
        if(/^本轮|^本次/.test(timeValue)&&parsedTime) recurrence=parsedTime.text;
        onset=legacy[2]+'前';
    }
    const clauses = chief.split(/[，,]/).filter(Boolean);
    const currentIndex = clauses.findIndex(text=>/^(?:(?:本轮|本次)(?!模式|与|来院|就诊)|今日|昨日|今晨|昨晚|\d+(?:小时|天|周|个月|年)前)/.test(text));
    const splitHistory = currentIndex > 0 && clauses.slice(0,currentIndex).every(text=>/既往|已确诊|曾有|曾发生/.test(text));
    const current = splitHistory ? clauses.slice(currentIndex) : clauses;
    const context = legacyContext || (splitHistory ? clauses.slice(0,currentIndex).join('，') : '');
    let symptom = current[0].replace(/^本轮/,'');
    let inlineSpeed='';
    const inline= symptom.match(/^(今日|昨日|今晨|昨晚)(突然|逐渐)?(?:出现|发现)(.+)$/);
    if(inline&&onset.startsWith(inline[1])) {
        symptom=inline[3];
        if(inline[2])inlineSpeed=inline[2]==='突然'?'起病突然':'起病较缓';
    }
    const prefix = symptom.match(new RegExp('^(?:近)?(' + duration + ')(?:前)?(?:出现)?'));
    const suffix = symptom.match(new RegExp('(' + duration + ')$'));
    if(prefix&&parsedTime&&/^本轮|^本次/.test(timeValue)&&onset!==prefix[1]+'前') {
        recurrence=parsedTime.text;
        onset=prefix[1]+'前';
    }
    // Keep historical intervals and conflicting time records intact.
    if (!/既往|已确诊|距末次|病程/.test(symptom)) {
        if (prefix && (!onset || onset === prefix[1] + '前')) {
            onset ||= prefix[1] + '前';
            symptom = symptom.slice(prefix[0].length);
        } else if (suffix && (!onset || onset === suffix[1] + '前')) {
            onset ||= suffix[1] + '前';
            symptom = symptom.slice(0,-suffix[0].length);
        }
    }
    if (!onset || /既往|已确诊|距末次|病程/.test(symptom)) return {text:chief,consumed};
    if (parsedTime || explicitTime || simpleDuration) consumed.add('common_1');
    let trigger = '';
    const triggerPrefix = symptom.match(/^(翻身后|站起后|起立后|无明显诱因)/);
    if (triggerPrefix) {
        trigger = triggerPrefix[1];
        symptom = symptom.slice(trigger.length);
    } else if (vertigo?.values.trigger && /眩晕|旋转/.test(symptom)) trigger = '翻身后';
    const triggerAnswer = questionsById.has('common_6') ? clinicalAnswer(questionsById.get('common_6')) : '';
    const triggerClauses=triggerAnswer.split(/[，,。；;]/).filter(Boolean);
    const onsetTriggers=triggerClauses.filter(text=>text==='无明显诱因'||/^(?:劳累|熬夜|情绪激动|运动)后出现$/.test(text));
    let usedTrigger='';
    if(!trigger&&onsetTriggers.length===1) {
        usedTrigger=onsetTriggers[0];trigger=usedTrigger.replace(/出现$/,'');
    }else if(trigger&&onsetTriggers.includes(trigger))usedTrigger=trigger;
    if(usedTrigger&&triggerClauses.length===1) consumed.add('common_6');
    symptom = symptom.replace(/^出现/, '');
    const course=questionsById.has('common_4')?clinicalAnswer(questionsById.get('common_4')):'';
    if(course==='反复发作'&&/^(?:头痛|眩晕|头昏|肢体无力|麻木|震颤|复视|吞咽困难|睡眠不佳)$/.test(symptom))symptom='反复'+symptom;
    if (record().topics.includes('dizzy')) symptom = symptom.replace(/旋转感/g,'旋转性眩晕');
    let verb=/发现/.test(parsedTime?.verb||'')?parsedTime.verb:'出现';
    const speed=questionsById.has('common_2')?clinicalAnswer(questionsById.get('common_2')):'';
    const currentTime=questionsById.has('current_onset')?clinicalAnswer(questionsById.get('current_onset')):'';
    if(!currentTime&&!recurrence&&verb==='出现'&&['突然出现','逐渐出现'].includes(speed)) {
        verb=speed;consumed.add('common_2');
    }
    const speedRepeated=inlineSpeed==='起病突然'?speed==='突然出现':inlineSpeed==='起病较缓'&&speed==='逐渐出现';
    const speedNote=inlineSpeed&&!speedRepeated?'，'+inlineSpeed:'';
    return {text:onset + trigger + verb + symptom + speedNote + (current.length>1?'，'+current.slice(1).join('，'):''),context,recurrence,usedTrigger,consumed};
}

function functionalHistoryText(text, defaultAttack = false) {
    const value = speechText(text).replace(/^诉/, '');
    const period = value.match(/^(发作间歇期|发作间期|发作间|间歇期|发作期间|发作时)(?:诉)?(.*)$/);
    if (period) {
        const label = ['发作期间','发作时'].includes(period[1]) ? '发作期间' : '发作间歇期';
        return label + '诉' + period[2].replace(/^能(?=独立|正常|行走)/,'可');
    }
    return (defaultAttack ? '发作期间诉' : '诉') + value.replace(/^能(?=独立|正常|行走)/,'可');
}

function vertigoHistoryParts(questionsById) {
    if (!record().topics.includes('dizzy')) return null;
    const ids = ['common_5','common_6','common_10','dizzy_1','dizzy_4','bppv_0','bppv_1'];
    const consumed = new Set();
    const remaining = [];
    const values = {rest:'',before:'',trigger:'',latency:'',duration:'',relief:'',walking:[]};
    for (const id of ids) {
        const question = questionsById.get(id);
        if (!question || !clinicalAnswer(question)) continue;
        consumed.add(id);
        for (const raw of clinicalAnswer(question).split(/[，,。；;]/).filter(Boolean)) {
            const text = speechText(raw).replace(/([\d.]+)(秒|分钟|小时|天)\/次/g,'每次持续$1$2');
            if (/^(?:目前)?静止时(?:无眩晕|不晕)$/.test(text)) values.rest = '静止时无眩晕';
            else if (/^(?:目前)?静卧时(?:无眩晕|不晕)$/.test(text)) {
                if (!values.rest) values.rest = '静卧时无眩晕';
            } else if (text === '翻身前不晕') values.before = '翻身前无眩晕';
            else if (['翻身后才出现','翻身后才发作','翻身后发作'].includes(text)) values.trigger = '翻身后出现眩晕';
            else if (/^(?:隔数秒|数秒后)(?:出现|开始)$/.test(text)) values.latency = '数秒后出现';
            else if (id === 'common_5' && /^(?:单次持续时间不详|每次)/.test(text)) values.duration = text === '单次持续时间不详' ? '每次持续时间不详' : text.replace(/^每次(?!持续)/,'每次持续');
            else if (['静止后缓解','静止后自行缓解'].includes(text)) values.relief = text;
            else {
                const walk = text.match(/^(?:诉)?(?:(?:发作间歇期|发作间期|发作间|间歇期|发作期间|发作时)(?:诉)?)?(?:可|能)(?:独立|正常)?行走$/);
                if (walk) values.walking.push(functionalHistoryText(text,id === 'dizzy_4'));
                else remaining.push(text);
            }
        }
    }
    if (!consumed.size) return null;
    const attack = [];
    if (values.rest) attack.push(values.rest);
    else if (values.before) attack.push(values.before);
    if (values.trigger && values.latency) attack.push('翻身数秒后发作');
    else if (values.trigger) attack.push(values.trigger);
    else if (values.latency) attack.push(values.latency);
    if (values.duration) attack.push(values.duration);
    if (values.relief) attack.push(values.relief);
    const sentences = [];
    if (attack.length) sentences.push(attack.join('，'));
    sentences.push(...new Set(values.walking));
    sentences.push(...new Set(remaining));
    return {consumed, sentences, values};
}

