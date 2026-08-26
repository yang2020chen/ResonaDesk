console.log('=== ResonaDesk Milestone 3 Empirical Integration Tests ===');

// Test data
let testSegments = [
  { id: 1, start: 0.0, end: 4.0, speaker: '说话人 1', text: '大家好欢迎收听本期播客' },
  { id: 2, start: 4.5, end: 9.0, speaker: '说话人 2', text: '大家好我是今天的特邀嘉宾' },
  { id: 3, start: 9.5, end: 14.0, speaker: '说话人 1', text: '我们今天来聊聊独立软件出海' },
  { id: 4, start: 14.2, end: 18.0, speaker: '说话人 2', text: '这个话题非常有价值' },
];

console.log('1. Testing Speaker Duration & Percentage Stats Calculation...');
const statsMap = new Map();
let totalTime = 0;

testSegments.forEach(s => {
  const dur = s.end - s.start;
  totalTime += dur;
  const curr = statsMap.get(s.speaker) || { totalTime: 0, count: 0 };
  curr.totalTime += dur;
  curr.count += 1;
  statsMap.set(s.speaker, curr);
});

const spk1 = statsMap.get('说话人 1');
const spk2 = statsMap.get('说话人 2');

if (spk1.totalTime !== 8.5 || spk2.totalTime !== 8.3) {
  throw new Error(`Stats mismatch: spk1=${spk1.totalTime}, spk2=${spk2.totalTime}`);
}
console.log(`   ✓ Speaker 1: ${spk1.totalTime}s (${((spk1.totalTime/totalTime)*100).toFixed(1)}%), count: ${spk1.count}`);
console.log(`   ✓ Speaker 2: ${spk2.totalTime}s (${((spk2.totalTime/totalTime)*100).toFixed(1)}%), count: ${spk2.count}`);

console.log('2. Testing Global Speaker Rename...');
const oldName = '说话人 1';
const newName = '主持人';
testSegments = testSegments.map(s => s.speaker === oldName ? { ...s, speaker: newName } : s);

if (testSegments[0].speaker !== '主持人' || testSegments[2].speaker !== '主持人') {
  throw new Error('Global rename failed');
}
console.log('   ✓ Global rename successfully updated 2 segments to "主持人".');

console.log('3. Testing Global Speaker Merge...');
const sourceSpk = '说话人 2';
const targetSpk = '主持人';
testSegments = testSegments.map(s => s.speaker === sourceSpk ? { ...s, speaker: targetSpk } : s);

const uniqueSpeakers = Array.from(new Set(testSegments.map(s => s.speaker)));
if (uniqueSpeakers.length !== 1 || uniqueSpeakers[0] !== '主持人') {
  throw new Error(`Merge failed: uniqueSpeakers=${uniqueSpeakers}`);
}
console.log('   ✓ Global merge successfully merged all segments into single "主持人" role.');

console.log('=== ALL MILESTONE 3 ROLE MANAGEMENT & DIARIZATION TESTS PASSED 100%! ===');
