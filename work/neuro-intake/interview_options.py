"""Optional shortcuts; choosing a route never supplies clinical findings."""
def configure_interview(common, topics, profiles):
    by_id = {question['id']: question for question in common}
    by_id['common_0']['optionsByTopic'] = {
        'headache':['头痛'], 'dizzy':['眩晕','头昏','站立不稳'],
        'weak':['肢体无力'], 'sensory':['麻木','感觉异常'],
        'seizure':['发作性意识改变','肢体抽动'], 'cognitive':['记忆下降','认知与行为变化'],
        'movement':['震颤','动作迟缓','不自主运动'], 'gait':['步态不稳'],
        'visual':['视力下降','复视','眼睑下垂'], 'bulbar':['面部歪斜','言语异常','吞咽困难'],
        'sleep':['睡眠不佳','白天嗜睡','睡中异常动作','腿部不适']}
    by_id['common_0']['options'] = list(dict.fromkeys(option for values in by_id['common_0']['optionsByTopic'].values() for option in values))
    times = ['今日','昨日','今晨','昨晚','3天前','1周前','1个月前','1年前']
    by_id['common_1'].update(label='最早起病时间', ask='最早出现这类症状是什么时候？若反复发作，本次再发时间可在后面另选。', options=times, exclusiveGroups=[times])
    by_id['common_2']['options'].append('逐渐出现')
    by_id['common_2']['ask'] = '本次症状是突然出现，还是逐渐出现？多久达到最明显？'
    by_id['common_2']['exclusiveGroups'] = [by_id['common_2']['options']]
    by_id['common_8']['exclusiveGroups'] = [['首次发生','既往有类似发作']]
    by_id['common_6']['options'] = ['无明显诱因','劳累后出现','熬夜后出现','情绪激动后出现','运动后出现','活动后加重','休息后缓解']
    by_id['common_6']['exclusiveGroups'] = [by_id['common_6']['options'][:5]]
    by_id['common_6']['ask'] = '最早起病前有何诱因？什么使症状加重或缓解？'
    by_id['common_9']['options'] = ['本次来院前未就诊或用药','本次来院前未就诊，自行用药','本次来院前曾在外院就诊','既往检查及用药资料待核对']
    by_id['common_9']['exclusiveGroups'] = [by_id['common_9']['options'][:3]]
    by_id['common_9']['why'] = '按实际经过选择。曾检查或用药时，再补充日期、药名剂量、结果来源及疗效，不自动补写检查结果或治疗效果。'
    common.insert(2, dict(id='current_onset', section='common', label='本次再发时间（选填）', ask='若这次是反复发作，最近这一次是什么时候开始的？', why='与最早起病时间分别记录；首次发作可以留空。', options=times, exclusiveGroups=[times], optional=True))
    common.insert(common.index(by_id['common_5'])+1, dict(id='attack_frequency', section='common', label='发作频率（选填）', ask='通常多久发作一次？这是既往频率还是本次变化？', why='按实际回答选择；若近期改变，补充变化发生的时间，不把既往频率当成本次频率。', options=['每日1次','每日数次','每周1次','每周数次','每月1次','每月约3次','发作频率不详'], optional=True))
    frequency=next(question for question in common if question['id']=='attack_frequency')
    frequency['exclusiveGroups']=[frequency['options']]
    headache=topics['headache']['questions']
    headache[0]['options'].extend(['左侧','右侧'])
    headache[0]['exclusiveGroups']=[['单侧','双侧','左侧','右侧']]
    headache[1]['exclusiveGroups']=[headache[1]['options']]
    # Keep legacy branch answers editable, while a shared companion-symptom card
    # is sufficient for a new encounter.
    profiles['migraine']['questions'][1]['optional']=True
    profiles['migraine']['questions'][1]['label']='补充头痛伴随（选填）'
