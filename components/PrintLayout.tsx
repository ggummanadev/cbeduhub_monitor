import React from 'react';
import { MonitoringReport, EVALUATION_QUESTIONS } from '../types';

interface PrintLayoutProps {
  data: MonitoringReport;
  printRef?: React.RefObject<HTMLDivElement | null>;
  isPreview?: boolean;
}

const formatKoreanDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return `${year}년 ${month}월 ${date}일 (${dayOfWeek})`;
  } catch (e) {
    return dateStr;
  }
};

export const PrintLayout: React.FC<PrintLayoutProps> = ({ data, printRef, isPreview = false }) => {
  const getYearFromDate = (dateStr: string) => {
    if (!dateStr) return '2026';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '2026';
      return d.getFullYear().toString();
    } catch {
      return '2026';
    }
  };

  const reportYear = getYearFromDate(data.visitDate);

  const wrapperStyle: React.CSSProperties = isPreview
    ? {
        margin: '0 auto',
        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        border: '1px solid #cbd5e1',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        background: '#ffffff',
      }
    : {
        position: 'fixed',
        top: 0,
        left: '-10000px',
        zIndex: -50,
      };

  return (
    // Offscreen or preview rendering container
    <div style={wrapperStyle}>
      <div ref={printRef || undefined} className="bg-white text-black font-sans print-container" style={{ width: '210mm', minHeight: '594mm' }}>
        
        {/* === PAGE 1: MONITORING REPORT === */}
        <div className="page-break py-10 px-20 flex flex-col h-[297mm] relative box-border justify-between" id="print-page-1" style={{ height: '297mm' }}>
          <div>
            {/* Header Title */}
            <div className="text-center mb-1">
              <span className="text-sm font-semibold tracking-wide text-gray-700">{reportYear}년 서원대학교 평생교육진흥본부</span>
            </div>
            <h1 className="text-2xl font-bold text-center mb-4 pb-2 border-b-4 border-blue-800">
              평생교육진흥본부 프로그램 모니터링 보고서
            </h1>

            {/* Program Info Table */}
            <table className="w-full border-collapse border-2 border-black text-xs mb-3 text-left">
              <tbody>
                <tr>
                  <td className="border border-black bg-gray-100 p-2 font-bold text-center w-24">프로그램명</td>
                  <td className="border border-black p-2 font-semibold" style={{ width: '25%' }}>{data.programName || '-'}</td>
                  <td className="border border-black bg-gray-100 p-2 font-bold text-center w-24">강의장소</td>
                  <td className="border border-black p-2 font-semibold" style={{ width: '25%' }}>{data.location || '-'}</td>
                </tr>
                <tr>
                  <td className="border border-black bg-gray-100 p-2 font-bold text-center">방문일시</td>
                  <td className="border border-black p-2 font-semibold">{formatKoreanDate(data.visitDate)}</td>
                  <td className="border border-black bg-gray-100 p-2 font-bold text-center">학습자</td>
                  <td className="border border-black p-2 font-semibold">
                    {data.learnerCount ? `${data.learnerCount}명` : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black bg-gray-100 p-2 font-bold text-center">운영인원</td>
                  <td className="border border-black p-0" colSpan={3}>
                    <table className="w-full h-full border-none border-collapse text-xs">
                      <tbody>
                        <tr>
                          <td className="border-r border-black bg-gray-50 p-2 font-bold text-center w-16">강사</td>
                          <td className="border-r border-black p-2 font-semibold w-24 text-center">{data.instructorName || '-'}</td>
                          <td className="border-r border-black bg-gray-50 p-2 font-bold text-center w-36">학습매니저/보조강사</td>
                          <td className="p-2 font-semibold text-center">{data.managerName || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Evaluations Sub-table enclosed by vertically aligned "모니터링 의견" label on left */}
            <div className="flex border-2 border-black text-[10px]">
              {/* Left Column: Vertical Header */}
              <div className="w-10 bg-gray-100 border-r border-black flex items-center justify-center font-bold text-center p-2 leading-relaxed text-sm shrink-0">
                <div style={{ writingMode: 'vertical-rl', textOrientation: 'upright', letterSpacing: '0.25em' }}>
                  모니터링의견
                </div>
              </div>

              {/* Right Column: Dynamic Subtable */}
              <div className="flex-grow flex flex-col">
                {/* Header Row */}
                <div className="flex bg-gray-100 font-bold border-b border-black text-center text-xs">
                  <div className="w-8 border-r border-black py-1.5 shrink-0">No</div>
                  <div className="flex-grow border-r border-black py-1.5 px-2 text-left">평가 세부내용</div>
                  <div className="w-16 py-1.5 shrink-0">5점 만점</div>
                </div>

                {/* 20 Questions Rows */}
                {EVALUATION_QUESTIONS.map((question, i) => (
                  <div key={i} className={`flex border-b border-black text-center ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <div className="w-8 border-r border-black py-1 shrink-0 flex items-center justify-center font-semibold">{i + 1}</div>
                    <div className="flex-grow border-r border-black py-1 px-2 text-left flex items-center">{question}</div>
                    <div className="w-16 py-1 shrink-0 flex items-center justify-center font-bold text-xs text-blue-800">
                      {data.scores[i] || 5}
                    </div>
                  </div>
                ))}

                {/* Other Opinion (기타 의견) */}
                <div className="flex bg-white">
                  <div className="w-full p-2 text-left">
                    <span className="font-bold text-xs text-gray-700 block mb-1">〈기타 의견〉</span>
                    <div className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[50px] p-1">
                      {data.otherOpinion || '특이사항 및 모니터링 의견 없음.'}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Submitter & Declaration Section */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-center text-xs font-semibold text-gray-700 mb-6">
              {reportYear}년 평생교육진흥본부 프로그램 모니터링을 위와 같이 보고합니다.
            </p>

            <div className="flex justify-end items-center mr-6 text-sm">
              <div className="flex items-center gap-4">
                <span className="font-bold text-gray-700">모니터링 담당자</span>
                <span className="font-semibold text-gray-900 border-b border-gray-400 pb-0.5 px-4 min-w-[80px] text-center">
                  {data.submitterName || '-'}
                </span>
                <div className="relative border border-dashed border-gray-300 w-24 h-12 flex items-center justify-center bg-gray-50 rounded">
                  {data.submitterSign ? (
                    <img src={data.submitterSign} alt="담당자 서명" className="h-full object-contain max-h-10" />
                  ) : (
                    <span className="text-[10px] text-gray-400">(서명 없음)</span>
                  )}
                  <span className="absolute bottom-0 right-1 text-[8px] text-gray-400">(인)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === PAGE 2: MONITORING PHOTOS === */}
        <div className="page-break py-10 px-20 flex flex-col h-[297mm] relative box-border justify-between border-t border-gray-200" id="print-page-2" style={{ height: '297mm' }}>
          <div className="flex-grow flex flex-col">
            {/* Title */}
            <div className="text-center mb-1">
              <span className="text-sm font-semibold tracking-wide text-gray-700">{reportYear}년 서원대학교 평생교육진흥본부</span>
            </div>
            <h1 className="text-2xl font-bold text-center mb-6 pb-2 border-b-4 border-blue-800">
              프로그램 모니터링 사진대지
            </h1>

            {/* Photos Layout matching the screenshot with a vertical "모니터링 사진" label on the left */}
            <div className="flex border-2 border-black flex-grow min-h-[180mm]">
              {/* Left Column: Vertical Header */}
              <div className="w-12 bg-gray-100 border-r border-black flex items-center justify-center font-bold text-center p-3 leading-loose text-base shrink-0">
                <div style={{ writingMode: 'vertical-rl', textOrientation: 'upright', letterSpacing: '0.4em' }}>
                  모니터링사진
                </div>
              </div>

              {/* Right Column: 2x2 Grid with descriptions */}
              <div className="flex-grow grid grid-cols-2 grid-rows-2">
                {/* Photo 1 */}
                <div className="border-r border-b border-black p-3 flex flex-col justify-between bg-white h-full">
                  <div className="flex-grow flex items-center justify-center overflow-hidden border border-gray-200 rounded bg-gray-50 h-[68mm]">
                    {data.photo1 ? (
                      <img src={data.photo1} alt="사진 1" className="max-h-[64mm] w-auto max-w-full object-contain" />
                    ) : (
                      <div className="text-center text-gray-400 p-4">
                        <p className="text-xs font-semibold">사진 미등록</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-center text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-300 py-1 rounded">
                    모니터링 증빙사진 1
                  </div>
                </div>
 
                {/* Photo 2 */}
                <div className="border-b border-black p-3 flex flex-col justify-between bg-white h-full">
                  <div className="flex-grow flex items-center justify-center overflow-hidden border border-gray-200 rounded bg-gray-50 h-[68mm]">
                    {data.photo2 ? (
                      <img src={data.photo2} alt="사진 2" className="max-h-[64mm] w-auto max-w-full object-contain" />
                    ) : (
                      <div className="text-center text-gray-400 p-4">
                        <p className="text-xs font-semibold">사진 미등록</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-center text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-300 py-1 rounded">
                    모니터링 증빙사진 2
                  </div>
                </div>
 
                {/* Photo 3 */}
                <div className="border-r border-black p-3 flex flex-col justify-between bg-white h-full">
                  <div className="flex-grow flex items-center justify-center overflow-hidden border border-gray-200 rounded bg-gray-50 h-[68mm]">
                    {data.photo3 ? (
                      <img src={data.photo3} alt="사진 3" className="max-h-[64mm] w-auto max-w-full object-contain" />
                    ) : (
                      <div className="text-center text-gray-400 p-4">
                        <p className="text-xs font-semibold">사진 미등록</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-center text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-300 py-1 rounded col-span-2">
                    모니터링 증빙사진 3
                  </div>
                </div>
 
                {/* Photo 4 */}
                <div className="p-3 flex flex-col justify-between bg-white h-full">
                  <div className="flex-grow flex items-center justify-center overflow-hidden border border-gray-200 rounded bg-gray-50 h-[68mm]">
                    {data.photo4 ? (
                      <img src={data.photo4} alt="사진 4" className="max-h-[64mm] w-auto max-w-full object-contain" />
                    ) : (
                      <div className="text-center text-gray-400 p-4">
                        <p className="text-xs font-semibold">사진 미등록</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-center text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-300 py-1 rounded">
                    모니터링 증빙사진 4
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer of Photo Page */}
          <div className="pt-4 mt-auto text-center border-t border-gray-200 flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-2">
              {/* Seowon University Lifelong Education Logo */}
              <svg width="18" height="22" viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <defs>
                  <linearGradient id="logo-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#55B6DC" />
                    <stop offset="100%" stopColor="#141154" />
                  </linearGradient>
                </defs>
                <path d="M 15,0 L 105,0 C 80,40 80,110 105,150 L 15,150 C 40,110 40,40 15,0 Z" fill="url(#logo-grad)" />
                <text x="60" y="102" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="85" fill="#FFFFFF" textAnchor="middle">S</text>
              </svg>
              <span className="font-bold text-blue-800 text-base leading-none">서원대학교 평생교육진흥본부</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
