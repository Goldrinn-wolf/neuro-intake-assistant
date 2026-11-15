// Groups describe narrative order, independently of the order of interview cards.
const STORY_RULES = {};
function storyRule(ids, group, format) {
    for (const id of ids.split(' ')) STORY_RULES[id] = {group,format};
}
const storyList = values => values.join('、');
const storyPrefix = prefix => values => prefix + storyList(values);
const storyRaw = values => values.join('，');
storyRule('common_0 common_1',0,storyRaw);
storyRule('common_2 common_3',1,storyRaw);
storyRule('common_6',2,storyRaw);
storyRule('common_4 common_5 attack_frequency',3,storyRaw);
storyRule('common_7',4,storyPrefix('伴'));
storyRule('common_8',5,storyRaw);
storyRule('current_onset',1,storyRaw);
storyRule('common_10 followup_baseline',7,storyRaw);
storyRule('common_9 followup_medication followup_adverse',9,storyRaw);
storyRule('common_11',10,storyRaw);

storyRule('headache_0',2,values => {
    const sites=values.filter(value=>['单侧','双侧','左侧','右侧','枕部','眼眶周围'].includes(value));
    const qualities=values.filter(value=>!sites.includes(value));
    return [sites.length?'头痛位于'+storyList(sites):'',qualities.length?'呈'+storyList(qualities)+'痛':''].filter(Boolean).join('，');
});
storyRule('headache_1',2,(values,entry) => [...values.map(value=>value==='情况不详'?'头痛强度及达峰时间不详':'头痛'+value),entry.amount!==undefined&&entry.amount!==''?'疼痛评分'+entry.amount+'/10分':''].filter(Boolean).join('，'));
storyRule('headache_2 migraine_0',2,values=>values.map(value=>({活动加重:'日常活动后头痛加重',需停止日常活动:'发作期间需停止日常活动',需卧床:'发作期间需卧床休息'}[value]||'头痛'+value)).join('，'));
storyRule('headache_3 migraine_1',4,storyPrefix('伴'));
storyRule('headache_4',4,storyPrefix('发作相关表现有'));
storyRule('headache_5 overuse_0',9,storyPrefix('相关情况及用药记录为'));
storyRule('migraine_2',4,values=>values.map(value=>({未发生先兆:'本次未出现先兆',逐渐扩展:'先兆症状逐渐扩展',连续出现不同症状:'先兆期连续出现不同症状',完全恢复:'先兆症状已完全恢复',仍有残留:'先兆症状仍有残留'}[value]||value)).join('，'));
storyRule('tension_0',2,values=>values.map(value=>({双侧压迫:'头痛呈双侧压迫样',紧箍样:'头痛呈紧箍样',活动不加重:'日常活动后头痛不加重',活动加重:'日常活动后头痛加重'}[value]||value)).join('，'));
storyRule('tension_1',4,values=>values.map(value=>({仍能活动:'头痛期间仍能活动',影响活动:'头痛影响日常活动'}[value]||'伴'+value)).join('，'));
storyRule('cluster_0',2,storyPrefix('头痛发作时有'));
storyRule('cluster_1',3,storyPrefix('发作期间'));
storyRule('overuse_1',4,storyPrefix('相关病史有'));

storyRule('dizzy_0',2,storyPrefix('头晕表现为'));
storyRule('dizzy_1 bppv_0 bppv_1 orthostatic_0',2,storyRaw);
storyRule('dizzy_2 dizzy_3 dizzy_5',4,storyPrefix('伴'));
storyRule('dizzy_4',7,values=>'发作期间诉'+storyList(values));
storyRule('bppv_2',9,storyPrefix('既往及操作相关情况有'));
storyRule('vestmigraine_0',4,storyRaw);
storyRule('vestmigraine_1',5,storyPrefix('既往有'));
storyRule('vestmigraine_2',4,storyRaw);
storyRule('meniere_0',2,storyPrefix('耳部症状记录为'));
storyRule('meniere_1',9,storyPrefix('听力检查情况为'));
storyRule('meniere_2',3,storyPrefix('眩晕发作次数及持续时间为'));
storyRule('orthostatic_1',4,storyPrefix('近期有'));
storyRule('orthostatic_2',4,storyPrefix('相关表现及病史有'));

storyRule('weak_0',2,values=>{
    const sites=values.filter(value=>!['近端明显','远端明显'].includes(value));
    return [sites.length?storyList(sites)+'无力':'',...values.filter(value=>!sites.includes(value))].filter(Boolean).join('，');
});
storyRule('weak_1',2,storyPrefix('表现为'));
storyRule('weak_2',3,storyRaw);
storyRule('weak_3 weak_4',4,storyPrefix('伴'));
storyRule('stroke_0',1,storyRaw);
storyRule('stroke_1',4,storyRaw);
storyRule('stroke_2',5,storyPrefix('相关用药及近期情况有'));
storyRule('stroke_3',5,storyPrefix('既往功能情况为'));
storyRule('cord_0',2,storyPrefix('麻木无力的分布及演变为'));
storyRule('cord_1',4,storyPrefix('伴'));
storyRule('cord_2',4,storyPrefix('相关症状及病史有'));
storyRule('mg_0',2,storyRaw);
storyRule('mg_1',4,storyPrefix('伴'));
storyRule('mg_2',5,storyPrefix('近期有'));
storyRule('gbs_0',3,storyPrefix('病程中有'));
storyRule('gbs_1 myopathy_0',4,storyPrefix('伴'));
storyRule('myopathy_1',4,storyPrefix('相关表现及暴露有'));

storyRule('sensory_0',2,storyPrefix('感觉异常表现为'));
storyRule('sensory_1',2,storyPrefix('感觉异常的分布为'));
storyRule('sensory_2',3,storyRaw);
storyRule('sensory_3',4,storyPrefix('伴'));
storyRule('neuropathy_0',2,storyPrefix('症状分布及功能表现为'));
storyRule('neuropathy_1',5,storyPrefix('相关病史有'));
storyRule('neuropathy_2',4,storyPrefix('伴'));
storyRule('root_0 root_1',2,storyRaw);

storyRule('seizure_0',2,storyPrefix('据目击描述'));
storyRule('seizure_1',2,storyPrefix('发作前有'));
storyRule('seizure_2',2,storyPrefix('发作期间有'));
storyRule('seizure_3',3,storyPrefix('发作后'));
storyRule('seizure_4',4,storyPrefix('相关损伤及诱发背景有'));
storyRule('epilepsy_0',2,storyPrefix('发作起始有'));
storyRule('epilepsy_1',2,storyPrefix('发作过程表现为'));
storyRule('epilepsy_2',3,storyPrefix('发作间恢复及近期情况为'));
storyRule('epilepsy_3',9,storyPrefix('既往检查及用药情况为'));
storyRule('syncope_0',2,storyPrefix('发作场景及前驱表现为'));
storyRule('syncope_1',3,storyPrefix('意识恢复情况为'));
storyRule('syncope_2',5,storyPrefix('相关心血管及家族病史有'));

storyRule('cognitive_0',5,storyPrefix('既往功能及知情者情况为'));
storyRule('cognitive_1',2,storyPrefix('认知变化表现为'));
storyRule('cognitive_2',3,storyPrefix('症状呈'));
storyRule('cognitive_3',4,storyPrefix('日常功能及行为变化有'));
storyRule('dementia_0',2,storyPrefix('最早出现变化的方面为'));
storyRule('dementia_1',7,storyPrefix('目前'));
storyRule('dementia_2',4,storyPrefix('近期相关情况有'));
storyRule('delirium_0',3,storyRaw);
storyRule('delirium_1',4,storyPrefix('近期有'));
storyRule('infection_0',2,storyPrefix('病程中出现'));
storyRule('infection_1',5,storyPrefix('近期接触及免疫背景有'));

storyRule('movement_0',2,storyPrefix('不自主运动表现为'));
storyRule('movement_1',2,storyPrefix('伴'));
storyRule('movement_2',4,storyPrefix('另有'));
storyRule('movement_3',9,storyPrefix('用药与症状变化记录为'));
storyRule('pd_0',2,storyRaw);
storyRule('pd_1',4,storyPrefix('伴'));
storyRule('pd_2',9,storyPrefix('药效及相关表现有'));
storyRule('et_0',2,storyPrefix('震颤发生的动作条件及部位为'));
storyRule('et_1',4,storyRaw);
storyRule('gait_0',2,storyPrefix('行走时诉'));
storyRule('gait_1',2,storyPrefix('步行不稳有以下情境特点：'));
storyRule('gait_2',7,storyPrefix('跌倒及扶持情况为'));
storyRule('gait_3',4,storyPrefix('伴'));

storyRule('visual_0',2,storyPrefix('视觉症状表现为'));
storyRule('visual_1',2,storyPrefix('遮眼及注视条件下的症状为'));
storyRule('visual_2',4,storyRaw);
storyRule('demyelination_0',5,storyRaw);
storyRule('demyelination_1 demyelination_2',4,storyPrefix('伴'));
storyRule('bulbar_0',2,storyPrefix('诉'));
storyRule('bulbar_1 bulbar_2',4,storyPrefix('伴'));
storyRule('bell_0',2,storyPrefix('面部功能变化表现为'));
storyRule('bell_1',4,storyPrefix('伴'));
storyRule('tn_0',2,values=>{
    const sites=values.filter(value=>['左侧','右侧','上颌区','下颌区'].includes(value));
    const features=values.filter(value=>!sites.includes(value));
    return [sites.length?'面部疼痛位于'+storyList(sites):'',features.length?'疼痛表现为'+storyList(features):''].filter(Boolean).join('，');
});
storyRule('tn_1',2,storyRaw);

storyRule('sleep_0',2,storyPrefix('睡眠问题表现为'));
storyRule('sleep_1',2,storyPrefix('作息及睡眠量为'));
storyRule('sleep_2 sleep_3',4,storyPrefix('另有'));
storyRule('sleep_4',2,storyPrefix('睡中动作及腿部不适情况为'));
storyRule('insomnia_0',2,storyRaw);
storyRule('insomnia_1',4,storyPrefix('伴'));
storyRule('insomnia_2',9,storyPrefix('助眠物使用及情绪情况有'));
storyRule('osa_0',2,storyPrefix('夜间有'));
storyRule('osa_1',4,storyPrefix('晨起及日间有'));
storyRule('osa_2',5,storyPrefix('相关病史有'));
storyRule('rls_0 rls_1',2,storyPrefix('腿部不适'));
storyRule('rls_2',4,storyPrefix('相关表现及病史有'));
storyRule('rbd_0',2,storyPrefix('睡中有'));
storyRule('rbd_1',4,storyPrefix('相关损伤及近期情况有'));
storyRule('narcolepsy_0',2,storyRaw);
storyRule('narcolepsy_1',2,storyPrefix('发作时'));
storyRule('narcolepsy_2',4,storyPrefix('另有'));

function storyGroup(question) { return STORY_RULES[question.id]?.group ?? 4; }

function formatStoryPicks(question, entry) {
    const rule=STORY_RULES[question.id];
    if (!rule) return storyList(entry.picks || []);
    return rule.format(entry.picks || [],entry,question);
}

function recurrenceSentence(value) {
    const time=parseHistoryTime(value);
    if (!time) return value;
    const subject=record().topics.length===1&&record().topics[0]==='headache'?'头痛':'上述症状';
    return time.text + subject + '再次发作';
}
