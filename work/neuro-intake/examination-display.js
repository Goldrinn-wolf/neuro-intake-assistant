
function examinationInstructions(exam, method, saved) {
    const body = '<p class="ask">' + h(method.how) + '</p><p class="why">' + h(method.why) + '</p>' +
        '<p><b>体位</b>　' + h(saved.method === 'alt' ? '按所选替代方法的实际体位记录' : exam.position) + '</p>' +
        '<ol>' + (saved.method === 'alt' ? [method.how] : exam.steps).filter(Boolean).map(step => '<li>' + h(step) + '</li>').join('') + '</ol>' +
        '<p>' + h(exam.observe) + '</p><p class="why">' + h(exam.limits) + '</p>' +
        (saved.method === 'alt' ? '<p class="scope-note">当前输出采用' + h(method.label) + '的实际记录。</p>' : '');
    return '<details class="operation compact-instructions"><summary>操作提示 · 为什么这样查</summary>' + body + '</details>';
}

function examinationControls(exam) {
    const muscles = muscleRows(exam);
    const reflexes = reflexRows(exam);
    if (record().examMode !== 'focused' || showOtherExams) return muscles + reflexes;
    return (muscles ? '<details class="muscle-entry"><summary>逐肌群填写，记录异常或部分结果</summary>' + muscles + '</details>' : '') +
        (reflexes ? '<details class="reflex-entry"><summary>左右侧分别记录反射分级</summary>' + reflexes + '</details>' : '');
}

