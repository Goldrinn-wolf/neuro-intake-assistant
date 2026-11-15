"""Symptom-first navigation over the existing interview content.

Labels select questions; they do not supply patient findings or diagnoses.
"""
GROUPS = [
 ('dizzy','头晕 / 眩晕','翻身后旋转、起立后头昏、持续头晕等'),
 ('headache','头痛','搏动样、压迫样、眼眶痛或用药相关等'),
 ('weak','肢体无力','单侧、双下肢、活动后加重或逐渐进展等'),
 ('sensory','麻木 / 感觉异常','分布、感觉性质、放射痛与体位关系'),
 ('seizure','晕厥 / 抽搐 / 意识发作','发作前、发作中、恢复过程与目击描述'),
 ('cognitive','记忆 / 认知 / 行为变化','逐渐下降、急性混乱或伴发热等'),
 ('movement','震颤 / 动作迟缓','手抖、不自主运动、僵硬与动作变慢'),
 ('gait','行走 / 平衡不稳','走不稳、拖脚、小步、跌倒等'),
 ('visual','视力 / 复视 / 眼睑异常','视力下降、视物成双、眼睑下垂等'),
 ('bulbar','面部 / 言语 / 吞咽异常','面部歪斜、面痛、说话或吞咽改变'),
 ('sleep','睡眠问题','失眠、嗜睡、打鼾、异常动作或腿部不适')
]

BRANCH_LABELS = {
 'bppv':('翻身、躺下或仰头后短暂眩晕','位置性眩晕相关追问'),
 'orthostatic':('站起后头昏、眼前发黑','直立性头晕 / 近晕厥相关追问'),
 'meniere':('眩晕伴耳鸣、耳闷或听力变化','耳部症状、发作时长与测听资料'),
 'vestmigraine':('眩晕伴头痛、畏光或畏声','前庭性偏头痛相关追问'),
 'migraine':('搏动样头痛、活动加重或伴恶心畏光','偏头痛相关追问'),
 'tension':('双侧压迫样、紧箍样头痛','紧张型头痛相关追问'),
 'cluster':('一侧眼眶剧痛，伴流泪或鼻塞','丛集性及三叉自主神经性头痛相关追问'),
 'overuse':('头痛频繁、止痛药用得较多或模式改变','用药天数与相关背景追问'),
 'stroke':('单侧无力或突然出现的无力','卒中 / TIA 相关追问，分别记录最后正常与发现时间'),
 'cord':('双下肢无力，伴感觉界限或排尿变化','脊髓相关症状追问'),
 'mg':('活动后更无力、休息改善或晨轻暮重','易疲劳、眼部及球部症状追问'),
 'gbs':('数小时至数天逐渐加重的无力','进展过程、感染前驱及呼吸吞咽追问'),
 'myopathy':('抬臂、起立、上楼困难或伴肌痛','近端功能、肌肉症状及相关用药追问'),
 'neuropathy':('手足麻木、烧灼或手套袜套样分布','周围神经症状相关追问'),
 'root':('麻木伴颈腰痛、放射痛或姿势关系','神经根 / 卡压相关追问'),
 'epilepsy':('肢体抽动、反应或行为异常','按发作顺序记录，保留目击者描述'),
 'syncope':('短暂失去意识、晕倒后恢复','场景、前驱与意识恢复追问'),
 'dementia':('记忆或日常能力逐渐下降','认知各领域、知情者与生活能力追问'),
 'delirium':('近期突然混乱、注意或清醒程度波动','急性变化、基线与近期诱因追问'),
 'infection':('认知或行为变化伴发热、头痛或抽搐','发热与神经症状的先后顺序追问'),
 'pd':('动作变慢、僵硬、静止时抖或起步困难','帕金森综合征相关症状追问'),
 'et':('持物、端杯、写字时抖','动作条件、分布与相关影响因素追问'),
 'demyelination':('视力变化伴眼球转动痛，或有历次神经症状','历次发作、视觉与脊髓相关症状追问'),
 'bell':('面部歪斜、闭眼困难或鼓腮漏气','面部功能、耳部及其他神经症状追问'),
 'tn':('面部电击样疼痛，刷牙或咀嚼可触发','疼痛侧别、分区、时长与触发追问'),
 'insomnia':('入睡困难、易醒或早醒','睡眠机会、夜间与日间影响追问'),
 'osa':('打鼾、憋醒或被发现呼吸暂停','同床者描述、夜间呼吸与日间后果追问'),
 'rls':('静息时腿难受、想活动','活动关系、昼夜规律及相似症状追问'),
 'rbd':('睡中喊叫、拳打脚踢或异常动作','睡眠时段、梦境、目击与受伤情况追问'),
 'narcolepsy':('白天控制不住入睡或情绪激动时突然无力','嗜睡、猝倒描述与入睡醒来现象追问')
}

def build_entry_catalog(topics, profiles, workflows, common, background, exams):
    entries = []
    shared = [question['id'] for question in common if question['id'] not in ['common_3','common_7','common_11']]
    full_exams = [exam['label'] for exam in exams]
    original = list(workflows.values())
    for parent,title,description in GROUPS:
        topic_ids = [question['id'] for question in topics[parent]['questions']]
        base = shared + (['common_3'] if parent=='weak' else []) + topic_ids + [q['id'] for q in background]
        generic = 'symptom_' + parent
        workflows[generic] = dict(title=title+' · 通用问诊',parent=parent,profile=None,
            questionIds=list(dict.fromkeys(base)),exams=full_exams,followup=False,comprehensive=True)
        branches = [dict(route=generic,title='暂不确定，先按'+title.split(' / ')[0]+'通用问诊',note='先记录症状，可随时加入更具体的追问方向',general=True)]
        for key,profile in profiles.items():
            if profile['parent'] != parent:
                continue
            route='symptom_'+parent+'_'+key
            label,note=BRANCH_LABELS[key]
            preset=next((workflow for workflow in original if workflow.get('profile')==key and not workflow.get('followup')),None)
            workflows[route]=dict(title=label,parent=parent,profile=key,
                questionIds=list(dict.fromkeys(base+[q['id'] for q in profile['questions']])),
                exams=preset['exams'] if preset else full_exams,followup=False,comprehensive=not bool(preset))
            branches.append(dict(route=route,title=label,note=note,profile=key))
        if parent=='dizzy':
            route='symptom_dizzy_continuous'
            workflows[route]=dict(workflows[generic],title='持续头晕 / 眩晕 · 通用问诊')
            branches.insert(2,dict(route=route,title='头晕或眩晕持续存在、一直不缓解',note='先记录持续时间、体位影响和站立行走能力'))
        for key,label in [('epilepsy','已确诊癫痫，进行复诊'),('pd','已确诊帕金森病，进行复诊')]:
            if workflows[key]['parent']==parent:
                branches.append(dict(route=key,title=label,note='核对本次变化、实际用药与不良反应',followup=True))
        entries.append(dict(key=parent,title=title,description=description,branches=branches))
    return entries
