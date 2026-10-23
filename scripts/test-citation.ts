import { appendCitationIfMissing, removeCitation, findRelevantKnowledge } from '../src/lib/ai/knowledge';

console.log('=== TEST 1: findRelevantKnowledge ===');
const q1 = 'xin chào hôm nay nên gọi món gì đây';
const t1 = findRelevantKnowledge(q1);
console.log('q1 (chào & hỏi món):', t1 === null ? 'PASS (null)' : 'FAIL: ' + t1?.title);

const q2 = 'hôm nay có món gì ngon không';
const t2 = findRelevantKnowledge(q2);
console.log('q2 (hỏi món ngon):', t2 === null ? 'PASS (null)' : 'FAIL: ' + t2?.title);

const q3 = 'cho tôi hỏi cách cài đặt máy in hóa đơn';
const t3 = findRelevantKnowledge(q3);
console.log('q3 (cài máy in):', t3?.id === 'printer-setup' ? 'PASS (printer-setup)' : 'FAIL');

const q4 = 'hướng dẫn sử dụng phần mềm pos';
const t4 = findRelevantKnowledge(q4);
console.log('q4 (hướng dẫn pos):', t4?.id === 'introduction' ? 'PASS (introduction)' : 'FAIL');

console.log('\n=== TEST 2: appendCitationIfMissing & removeCitation ===');
const ansCasual = 'Chào bạn! Hôm nay quán có Trà sữa trân châu và Ép dưa hấu rất ngon nhé.';
const resCasual = appendCitationIfMissing(ansCasual, null);
console.log('appendCitationIfMissing with null topic has citation?:', /Nguồn:/i.test(resCasual) ? 'FAIL (has citation)' : 'PASS (no citation)');

const ansWithAccidentalCitation = ansCasual + '\n\n[Nguồn: Hướng dẫn sử dụng > Giới thiệu chung](/user-guide#introduction)';
const cleaned = removeCitation(ansWithAccidentalCitation);
console.log('removeCitation removes unwanted citation?:', !/Nguồn:/i.test(cleaned) && cleaned.includes('rất ngon nhé') ? 'PASS' : 'FAIL');

const ansGuide = 'Để cài máy in, bạn vào Cài đặt -> Cài đặt in hóa đơn.';
const resGuide = appendCitationIfMissing(ansGuide, t3);
console.log('appendCitationIfMissing with printer topic has citation?:', /Nguồn: Hướng dẫn sử dụng > Cài đặt hệ thống/i.test(resGuide) ? 'PASS' : 'FAIL');
