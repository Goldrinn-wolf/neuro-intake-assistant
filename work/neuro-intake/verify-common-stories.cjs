const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
const context=vm.createContext({console,localStorage:{getItem:()=>null,setItem:()=>{}},Date,Map,Set});
for(const name of ['data.js','workflow.js','closing.js','story-rules.js','history-composition.js','narrative.js']){
 const dir=name==='data.js'?'outputs/查房联动演示/assistant/':'work/neuro-intake/';
 vm.runInContext(fs.readFileSync(dir+name,'utf8'),context);
}
const source=fs.readFileSync('work/neuro-intake/app.js','utf8');
vm.runInContext(source.slice(0,source.indexOf('function fieldCard(')),context);
const run=s=>vm.runInContext(s,context);
const pick=(...picks)=>({state:'record',picks,note:''});
const numeric=(amount,unit)=>({state:'record',picks:[],note:'',amount,unit});
function load(topic,profile,answers,workflow){
 context.fixture={answers:Object.fromEntries(Object.entries(answers).map(([id,value])=>[id,typeof value==='string'?{state:'record',picks:[],note:value}:value])),exams:{},topics:[topic],profiles:profile?[profile]:[],...(workflow?{workflow}:{})};
 run("active='draft';records.draft=fixture;");
 return run('naturalHistoryText()');
}
let history=load('headache','migraine',{
 common_0:pick('头痛'),common_1:numeric('5','年前'),current_onset:pick('昨日'),
 common_2:pick('逐渐出现'),common_4:pick('反复发作'),common_5:numeric('6','小时/次'),
 attack_frequency:pick('每月约3次'),common_6:pick('无明显诱因'),
 headache_0:pick('左侧','搏动样'),headache_1:{...numeric('6','分（0—10）'),picks:['逐渐达峰']},
 headache_3:pick('恶心','畏光'),migraine_1:pick('恶心','畏光'),
 migraine_0:pick('活动加重','需停止日常活动'),migraine_2:pick('未发生先兆'),
 common_8:pick('既往有类似发作'),common_9:pick('本次来院前未就诊或用药'),common_10:'目前仍有头痛'
},'migraine');
assert(history.startsWith('5年前无明显诱因出现反复头痛。'));
assert(history.includes('头痛位于左侧，呈搏动样痛'));
assert(history.includes('疼痛评分6/10分'));
assert(history.includes('每次持续6小时，每月约3次'));
assert.equal((history.match(/伴恶心、畏光/g)||[]).length,1);
assert(history.includes('昨日头痛再次发作'));
assert(history.indexOf('头痛位于')<history.indexOf('伴恶心'));
assert(history.indexOf('昨日头痛再次发作')<history.indexOf('头痛位于'));
assert(history.indexOf('昨日头痛再次发作')<history.indexOf('本次来院前未就诊或用药'));
assert(!/收住入院|精神可|大小便如常|未见异常|患者自述|部位与性质为/.test(history));
console.log(history);
const prior=run('JSON.stringify(record())');context.prior=prior;
run("record().answers.common_5={state:'unknown',picks:[],note:''}");
assert(run('naturalHistoryText()').includes('每次持续时间不详，每月约3次'));
run("records.draft=JSON.parse(prior);delete record().answers.common_6");
assert(!run('naturalHistoryText()').includes('无明显诱因'));
run("records.draft=JSON.parse(prior);record().answers.headache_3={state:'record',picks:['以上均否认'],note:''};record().answers.migraine_1={state:'record',picks:[],note:'发作前有短暂视物闪光，约20分钟后恢复'}");
assert(run('naturalHistoryText()').includes('否认恶心、呕吐、畏光、畏声、发热、颈痛'));
assert(run('naturalHistoryText()').includes('发作前有短暂视物闪光，约20分钟后恢复'));
for(const key of ['stable_migraine','stable_tension']){
 context.sampleKey=key;
 const fixture=run('CONTENT.simulations.find(sample=>sample.key===sampleKey)');
 const workflow=run('CONTENT.workflows[CONTENT.simulations.find(sample=>sample.key===sampleKey).workflow]');
 const text=load(workflow.parent,workflow.profile,fixture.notes,fixture.workflow);
 assert(!/\d+岁/.test(text));
 assert(!text.startsWith('既往诊断'));
 assert(text.includes(key==='stable_migraine'?'5年前':'8个月前'));
 if(key==='stable_migraine'){assert(text.includes('伴恶心、畏光'));assert(text.includes('昨日头痛再次发作'));}
 console.log(key+': '+text);
}
const discovered=load('weak','stroke',{
 common_0:'既往偏头痛，今日突然出现右手无力和说话不清',
 common_1:'今日09:20首次发现',common_2:pick('突然出现'),
 common_3:'昨晚22:00最后正常，由家属确认',common_9:'急诊就诊，检查资料待核对'
});
assert(discovered.startsWith('今日09:20首次发现右手无力和说话不清'));
assert(discovered.includes('昨晚22:00最后正常，由家属确认'));
assert(discovered.includes('既往偏头痛'));
assert(!discovered.startsWith('今日09:20出现'));
run("record().answers.common_2={state:'record',picks:['逐渐出现'],note:''}");
assert(run('naturalHistoryText()').includes('起病突然'));
assert(run('naturalHistoryText()').includes('起病较缓'));
const waking=load('weak','stroke',{common_0:pick('肢体无力'),common_1:'今晨发现',stroke_0:pick('睡醒发现'),common_3:'昨晚22:00最后正常'});
assert(waking.startsWith('今晨发现肢体无力'));
assert(waking.includes('睡醒发现'));
assert(waking.includes('昨晚22:00最后正常'));
const families=run('Object.entries(CONTENT.profiles).map(([key,value])=>({key,parent:value.parent,questions:value.questions}))');
for(const {key,parent,questions} of families){
 const answers={common_0:'相关症状',common_1:'3天前',common_9:'本次来院前未就诊或用药'};
 for(const question of questions){
  context.questionId=question.id;
  assert(run('!!STORY_RULES[questionId]'),'Missing story rule: '+question.id);
  if(question.options.length)answers[question.id]=pick(question.options[0]);
  else answers[question.id]='补充的事实原文及时间、侧别';
 }
 const text=load(parent,key,answers);
 assert(text.startsWith('3天前'));
 assert(!/undefined|NaN|\[object Object\]/.test(text));
 assert(text.indexOf('本次来院前未就诊或用药')>text.indexOf('3天前'));
}
context.topicQuestions=run('Object.values(CONTENT.topics).flatMap(topic=>topic.questions)');
assert.equal(run('topicQuestions.filter(question=>!STORY_RULES[question.id]).length'),0);
const empty=load('headache','migraine',{},'migraine');
assert(!/无明显诱因|否认|正常|头痛位于|再次发作/.test(empty));
console.log('PASS: chronological headache composition, symptom deduplication, unknown duration with known frequency, negative/qualified fact preservation, both legacy headache samples, all '+families.length+' disease branches and all symptom-question rules.');
