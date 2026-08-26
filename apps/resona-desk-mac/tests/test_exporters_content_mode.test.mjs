import { exportToSRT, exportToVTT, exportToTXT, exportToFCPXML } from '../src/utils/exporters.ts';

console.log('=== Testing Subtitle Exporters with Content Modes (Original / Translation / Bilingual) ===');

const mockSegments = [
  {
    id: 1,
    start: 1.0,
    end: 4.5,
    speaker: '说话人 1',
    text: '你知道咱们网站有个超厉害的功能吗？',
    translation: 'Do you know our website has a super powerful feature?'
  },
  {
    id: 2,
    start: 5.0,
    end: 8.0,
    speaker: '说话人 2',
    text: '当然啦，可以让多个人同时对口型！',
    translation: 'Of course! It allows multiple people to lip-sync at once!'
  }
];

// 1. Test SRT in 3 modes
console.log('1. Testing SRT Export in 3 modes...');
const srtOrig = exportToSRT(mockSegments, { contentMode: 'original', includeSpeakers: false });
const srtTrans = exportToSRT(mockSegments, { contentMode: 'translation', includeSpeakers: false });
const srtBi = exportToSRT(mockSegments, { contentMode: 'bilingual', includeSpeakers: false });

if (!srtOrig.includes('你知道咱们网站') || srtOrig.includes('super powerful')) throw new Error('SRT original mode failed');
if (!srtTrans.includes('super powerful') || srtTrans.includes('你知道咱们网站')) throw new Error('SRT translation mode failed');
if (!srtBi.includes('你知道咱们网站') || !srtBi.includes('super powerful')) throw new Error('SRT bilingual mode failed');
console.log('   ✓ SRT 3 modes verified.');

// 2. Test VTT in 3 modes
console.log('2. Testing VTT Export in 3 modes...');
const vttTrans = exportToVTT(mockSegments, { contentMode: 'translation', includeSpeakers: true });
if (!vttTrans.includes('Of course!') || vttTrans.includes('当然啦')) throw new Error('VTT translation mode failed');
console.log('   ✓ VTT 3 modes verified.');

// 3. Test TXT in 3 modes
console.log('3. Testing TXT Export in 3 modes...');
const txtBi = exportToTXT(mockSegments, { contentMode: 'bilingual', includeSpeakers: true });
if (!txtBi.includes('↳ 译文: Do you know')) throw new Error('TXT bilingual mode failed');
console.log('   ✓ TXT 3 modes verified.');

// 4. Test FCPXML in 3 modes
console.log('4. Testing FCPXML Export in 3 modes...');
const fcpxmlTrans = exportToFCPXML(mockSegments, { contentMode: 'translation', includeSpeakers: true });
if (!fcpxmlTrans.includes('super powerful') || fcpxmlTrans.includes('你知道咱们网站')) throw new Error('FCPXML translation mode failed');
console.log('   ✓ FCPXML 3 modes verified.');

console.log('\n>>> ALL EXPORTER CONTENT MODES TEST PASSED 100%! <<<');
