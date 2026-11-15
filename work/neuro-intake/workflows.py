"""Clinician-selected encounter routes, not automatic diagnosis."""
def build_workflows(topics, profiles):
    common=['common_0','common_1','current_onset','common_2','common_4','common_5','attack_frequency','common_6','common_8','common_9','common_10']
    baseline=['生命体征','一般观察与配合','意识与定向','构音']
    workflows={}
    def add(key,title,parent,profile,question_ids,exams,followup=False):
        workflows[key]=dict(title=title,parent=parent,profile=profile,questionIds=list(dict.fromkeys(common+question_ids)),exams=list(dict.fromkeys(baseline+exams)),followup=followup)
    headache=['语言','瞳孔 II、III','眼位与眼球运动 III、IV、VI','上肢肌力','下肢肌力','自然步态']
    add('migraine','偏头痛 · 稳定模式','headache','migraine',['headache_0','headache_1','headache_3','migraine_0','migraine_1','migraine_2','background_1'],headache)
    add('tension','紧张型头痛','headache','tension',['headache_0','headache_1','headache_3','tension_0','tension_1','background_1'],headache)
    vestibular=['眼位与眼球运动 III、IV、VI','眼震','床旁听力 VIII','指鼻试验','跟膝胫试验','坐位稳定性','站立与Romberg','自然步态','位置试验']
    add('bppv','位置性短暂眩晕','dizzy','bppv',['dizzy_0','dizzy_1','dizzy_2','dizzy_4','bppv_0','bppv_1','bppv_2'],vestibular)
    add('vestmigraine','前庭性偏头痛相关症状','dizzy','vestmigraine',['dizzy_0','dizzy_1','dizzy_2','dizzy_4','vestmigraine_0','vestmigraine_1','vestmigraine_2'],vestibular[:-1])
    add('orthostatic','起立后头昏 / 近晕厥','dizzy','orthostatic',['dizzy_0','dizzy_1','dizzy_5','orthostatic_0','orthostatic_1','orthostatic_2','background_1'],['自主神经相关检查','上肢肌力','下肢肌力','坐位稳定性','自然步态'])
    add('epilepsy','癫痫 · 已确诊复诊','seizure','epilepsy',['seizure_0','seizure_3','seizure_4','epilepsy_3','background_1'],['语言','眼位与眼球运动 III、IV、VI','面肌 VII','上肢肌力','下肢肌力','指鼻试验','自然步态'],True)
    add('pd','帕金森病 · 已确诊复诊','movement','pd',['movement_0','movement_1','movement_2','pd_0','pd_1','pd_2','background_1'],['肌容积与自发活动','肌张力','轮替动作','坐位稳定性','站立与Romberg','自然步态','自主神经相关检查'],True)
    add('et','特发性震颤相关症状','movement','et',['movement_0','et_0','et_1','background_1'],['肌容积与自发活动','肌张力','上肢肌力','轮替动作','指鼻试验','自然步态'])
    add('neuropathy','慢性周围神经症状','sensory','neuropathy',['sensory_0','sensory_1','sensory_2','neuropathy_0','neuropathy_1','neuropathy_2','background_1'],['上肢肌力','下肢肌力','膝反射','跟腱反射','浅感觉','振动觉','关节位置觉','自然步态'])
    add('bell','周围性面瘫相关症状','bulbar','bell',['bulbar_0','bulbar_2','bell_0','bell_1','background_0'],['眼位与眼球运动 III、IV、VI','面部感觉 V','面肌 VII','床旁听力 VIII','软腭与声音 IX、X','伸舌 XII','上肢肌力','下肢肌力'])
    add('tn','三叉神经痛相关症状','bulbar','tn',['tn_0','tn_1','background_1'],['面部感觉 V','咀嚼肌 V','面肌 VII','眼位与眼球运动 III、IV、VI'])
    add('insomnia','失眠相关症状','sleep','insomnia',['sleep_0','sleep_1','insomnia_0','insomnia_1','insomnia_2','background_1'],['注意与记忆','自然步态'])
    add('rls','不宁腿相关症状','sleep','rls',['sleep_0','rls_0','rls_1','rls_2','background_1'],['下肢肌力','膝反射','跟腱反射','浅感觉','振动觉','自然步态'])
    return workflows

FOLLOWUP=[
 dict(id='followup_baseline',section='followup',label='与上次相比',ask='本次与上次症状、生活能力相比怎样？有新增症状吗？',why='复诊路径仍需核对模式变化。',options=['与上次相似','较前改善','较前加重','出现新症状','情况不详']),
 dict(id='followup_medication',section='followup',label='用药与依从性',ask='实际吃什么药、每次多少、每天几次？漏药或自行增减过吗？',why='与处方和患者实际用法分别核对。',options=['按处方服用','有漏服','自行减量','自行停药','新增药物','情况不详']),
 dict(id='followup_adverse',section='followup',label='不良反应与功能',ask='有新不适、跌倒、嗜睡或影响工作的情况吗？',why='记录患者实际观察及与用药时间的关系。',options=['新发不适','跌倒','嗜睡','影响工作生活','以上均否认','情况不详'])
]

SCREENING=[
 dict(id='screen_change',label='本次模式变化',ask='本次与既往模式相比有无明显变化？',options=['无明显改变','首次出现或明显改变','情况不详'],risk=['首次出现或明显改变']),
 dict(id='screen_focal',label='新发局灶神经症状',ask='本次是否新发单侧无力、言语异常、视力或视野变化、复视？',options=['逐项询问后均否认','存在相关新症状','尚未充分询问'],risk=['存在相关新症状']),
 dict(id='screen_conscious',label='意识与行为变化',ask='是否有新发意识改变、明显混乱或发作后持续未恢复？',options=['询问后否认','存在相关变化','情况不详'],risk=['存在相关变化']),
 dict(id='screen_headache',label='头痛警示特征',ask='是否有突发剧烈头痛、迅速达峰或发热伴头痛颈部症状？',options=['询问后否认','存在相关表现','不适用于本次主诉','情况不详'],risk=['存在相关表现']),
 dict(id='screen_progress',label='迅速进展与呼吸吞咽',ask='是否有快速加重的无力、呼吸困难或新发明显吞咽障碍？',options=['询问后否认','存在相关表现','情况不详'],risk=['存在相关表现']),
 dict(id='screen_balance',label='持续眩晕与严重不稳',ask='是否有新发持续眩晕或新发不能独立坐站行走？',options=['询问后否认','存在相关表现','不适用于本次主诉','情况不详'],risk=['存在相关表现'])
]

SIMULATIONS=[
 dict(key='click_headache',title='头痛点选演练（空白问诊）',workflow='migraine',blank=True,notes={}),
 dict(key='stable_migraine',title='稳定偏头痛复诊',workflow='migraine',risk=None,notes={
 'common_0':'虚构病例。32岁，既往诊断偏头痛，近5年反复发作，本次模式与以往一致',
 'common_1':'本轮头痛昨日出现','common_2':'逐渐出现','common_4':'反复发作',
 'common_5':'以往每次约6小时，每月约3次','common_8':'既往有相同模式发作',
 'headache_0':'单侧搏动样痛','migraine_0':'日常活动加重，发作时需暂停工作',
 'migraine_1':'伴恶心、畏光','migraine_2':'本次未发生先兆'}),
 dict(key='stable_tension',title='稳定双侧压迫样头痛',workflow='tension',risk=None,notes={
 'common_0':'虚构病例。28岁，近8个月反复双侧压迫样头痛，本次与既往相似',
 'common_1':'本次于今日午后出现','common_2':'逐渐出现','common_4':'反复发作',
 'common_5':'每次约2至3小时','common_6':'工作紧张时明显',
 'tension_0':'双侧紧箍样，日常活动不加重','tension_1':'仍能活动，无恶心呕吐及畏光畏声'}),
 dict(key='short_positional',title='翻身后十余秒旋转',workflow='bppv',risk=None,notes={
 'common_0':'虚构病例。46岁，近1年曾有同类短暂发作，本轮翻身后反复旋转感3天','common_1':'本轮3天前出现',
 'common_2':'改变头位后突然开始','common_4':'反复短暂发作','common_5':'每次10至20秒',
 'common_6':'静止时不晕','dizzy_0':'周围旋转','dizzy_2':'无耳鸣及主观听力变化',
 'dizzy_4':'发作间自述能独立行走','bppv_0':'翻身前不晕','bppv_1':'隔数秒出现，静止后缓解',
 'bppv_2':'无近期颈部外伤或已知活动受限，位置试验待评估'}),
 dict(key='stable_epilepsy',title='癫痫稳定复诊与用药核对',workflow='epilepsy',risk=None,notes={
 'common_0':'虚构病例。已确诊癫痫，距末次发作8个月，本次常规复诊',
 'common_1':'既往病程3年','common_4':'近8个月未再发作','common_8':'既往有相同发作模式',
 'followup_baseline':'与上次相似，无新增症状','followup_medication':'自述按既往处方服用，无漏服或自行增减',
 'followup_adverse':'已询问，否认新发不适、跌倒或嗜睡','epilepsy_3':'检查资料与既往处方待核对'}),
 dict(key='new_focal',title='头痛患者新发右手无力',workflow='migraine',risk='screen_focal',riskNote='今日突然出现右手无力及说话不清，目前仍有症状',notes={
 'common_0':'虚构病例。既往偏头痛，今日突然出现右手无力和说话不清',
 'common_1':'今日09:20首次发现','common_2':'突然出现','common_4':'症状仍持续',
 'common_8':'本次表现与既往偏头痛不同'}),
 dict(key='persistent_dizzy',title='持续眩晕伴严重站立不稳',workflow='bppv',risk='screen_balance',riskNote='新发持续旋转感30小时，需两人扶持才能站立',notes={
 'common_0':'虚构病例。持续旋转感30小时，需两人扶持才能站立',
 'common_1':'昨日早餐时出现','common_2':'突然出现','common_4':'持续存在',
 'dizzy_0':'周围旋转','dizzy_1':'静卧仍晕，头动加重','dizzy_4':'自述需两人扶持站立'})
]

