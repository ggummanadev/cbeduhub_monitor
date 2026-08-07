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
    <div style={wrapperStyle} className={!isPreview ? 'print-wrapper' : ''}>
      <div ref={printRef || undefined} className="bg-white text-black font-sans print-container" style={{ width: '210mm', minHeight: '594mm' }}>
        
        {/* === PAGE 1: MONITORING REPORT === */}
        <div className="page-break py-8 px-20 flex flex-col h-[297mm] relative box-border justify-between overflow-hidden" id="print-page-1" style={{ height: '297mm' }}>
          <div className="flex-grow flex flex-col">
            {/* Top Header requested by user */}
            <div className="text-center mb-2">
              <span className="font-bold text-blue-900 text-[17px]">
                서원대학교 평생교육진흥본부
              </span>
            </div>

            {/* Header Title */}
            <h1 className="text-[25px] font-bold text-center mb-3 pb-2 border-b-4 border-blue-800">
              평생교육진흥본부 프로그램 모니터링 보고서
            </h1>

            {/* Program Info Table */}
            <table className="w-full border-collapse border-2 border-black text-[13px] mb-3 text-left table-fixed">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="border border-black bg-gray-100 p-2 font-bold text-center">프로그램명</td>
                  <td className="border border-black p-2 font-semibold" colSpan={2}>{data.programName || '-'}</td>
                  <td className="border border-black bg-gray-100 p-2 font-bold text-center">강의장소</td>
                  <td className="border border-black p-2 font-semibold">{data.location || '-'}</td>
                </tr>
                <tr>
                  <td className="border border-black bg-gray-100 p-2 font-bold text-center">방문일시</td>
                  <td className="border border-black p-2 font-semibold" colSpan={2}>{formatKoreanDate(data.visitDate)}</td>
                  <td className="border border-black bg-gray-100 p-2 font-bold text-center">학습자</td>
                  <td className="border border-black p-2 font-semibold">
                    {data.learnerCount ? `${data.learnerCount}명` : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black bg-gray-100 p-2 font-bold text-center">운영인원</td>
                  <td className="border border-black bg-gray-50 p-2 font-bold text-center">강사</td>
                  <td className="border border-black p-2 font-semibold text-center">{data.instructorName || '-'}</td>
                  <td className="border border-black bg-gray-50 p-2 font-bold text-center">학습매니저/보조강사</td>
                  <td className="border border-black p-2 font-semibold text-center">{data.managerName || '-'}</td>
                </tr>
              </tbody>
            </table>

            {/* Evaluations Sub-table enclosed by vertically aligned "모니터링 의견" label on left */}
            <table className="w-full border-collapse border-2 border-black text-[11px] text-center table-fixed">
              <colgroup>
                <col style={{ width: '40px' }} />
                <col style={{ width: '32px' }} />
                <col style={{ width: 'auto' }} />
                <col style={{ width: '64px' }} />
              </colgroup>
              <tbody>
                {/* Header Row */}
                <tr className="bg-gray-100 font-bold text-[13px]">
                  <td rowSpan={22} className="border border-black bg-gray-100 text-[15px] p-2 align-middle text-center w-10">
                    <div className="inline-block leading-relaxed" style={{ writingMode: 'vertical-rl', textOrientation: 'upright', letterSpacing: '0.25em' }}>
                      모니터링의견
                    </div>
                  </td>
                  <td className="border border-black py-1.5 w-8">No</td>
                  <td className="border border-black py-1.5 px-2 text-left">평가 세부내용</td>
                  <td className="border border-black py-1.5 w-16">5점 만점</td>
                </tr>

                {/* 20 Questions Rows */}
                {EVALUATION_QUESTIONS.map((question, i) => (
                  <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="border border-black py-1 font-semibold align-middle">{i + 1}</td>
                    <td className="border border-black py-1 px-2 text-left align-middle">{question}</td>
                    <td className="border border-black py-1 font-bold text-[13px] text-blue-800 align-middle">
                      {data.scores[i] || 5}
                    </td>
                  </tr>
                ))}

                {/* Other Opinion (기타 의견) */}
                <tr className="bg-white text-left align-top">
                  <td colSpan={3} className="border border-black p-2">
                    <span className="font-bold text-[13px] text-gray-700 block mb-1">〈기타 의견〉</span>
                    <div className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[80px] p-1">
                      {data.otherOpinion || '특이사항 및 모니터링 의견 없음.'}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Submitter & Declaration Section */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-center text-[13px] font-semibold text-gray-700 mb-4">
              {reportYear}년 평생교육진흥본부 프로그램 모니터링을 위와 같이 보고합니다.
            </p>

            <div className="flex justify-end items-center mr-6 text-[15px] mb-4">
              <div className="flex items-center gap-4">
                <span className="font-bold text-gray-700">모니터링 담당자</span>
                <span className="font-semibold text-gray-900 border-b border-gray-400 pb-0.5 px-4 min-w-[80px] text-center">
                  {data.submitterName || '-'}
                </span>
                <div className="relative border border-dashed border-gray-300 w-48 h-16 flex items-center justify-center bg-gray-50 rounded">
                  {data.submitterSign ? (
                    <img src={data.submitterSign} alt="담당자 서명" className="h-full object-contain max-h-14" />
                  ) : (
                    <span className="text-[11px] text-gray-400">(서명 없음)</span>
                  )}
                  <span className="absolute bottom-0 right-1 text-[9px] text-gray-400">(인)</span>
                </div>
              </div>
            </div>

            {/* Footer of Page 1 */}
            <div className="pt-4 mt-auto border-t border-gray-200 text-center">
              <span className="font-bold text-blue-900 text-[17px]">
                서원대학교 평생교육진흥본부
              </span>
            </div>
          </div>
        </div>

        {/* === PAGE 2: MONITORING PHOTOS === */}
        <div className="page-break py-8 px-20 flex flex-col h-[297mm] relative box-border justify-between border-t border-gray-200 overflow-hidden" id="print-page-2" style={{ height: '297mm' }}>
          <div className="flex-grow flex flex-col">
            {/* Title */}
            <h1 className="text-[25px] font-bold text-center mb-6 pb-2 border-b-4 border-blue-800 mt-4">
              프로그램 모니터링 사진대지
            </h1>

            {/* Photos Layout matching the screenshot with a vertical "모니터링 사진" label on the left */}
            <table className="w-full border-collapse border-2 border-black table-fixed h-[190mm]">
              <colgroup>
                <col style={{ width: '48px' }} />
                <col style={{ width: 'auto' }} />
                <col style={{ width: 'auto' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td rowSpan={3} className="border border-black bg-gray-100 text-[17px] p-2 align-middle text-center font-bold w-12">
                    <div className="inline-block" style={{ writingMode: 'vertical-rl', textOrientation: 'upright', letterSpacing: '0.4em' }}>
                      모니터링사진
                    </div>
                  </td>
                  <td className="border border-black p-2 bg-white h-[66mm] align-top">
                    {/* Photo 1 */}
                    <div className="flex flex-col justify-between h-full">
                      <div className="flex-grow flex items-center justify-center overflow-hidden border border-gray-200 rounded bg-gray-50 h-[46mm]">
                        {data.photo1 ? (
                          <img src={data.photo1} alt="사진 1" className="max-h-[42mm] w-auto max-w-full object-contain" />
                        ) : (
                          <div className="text-center text-gray-400 p-2">
                            <p className="text-[13px] font-semibold">사진 미등록</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-center text-[11px] font-bold text-gray-700 bg-gray-100 border border-gray-300 py-0.5 rounded">
                        모니터링 증빙사진 1
                      </div>
                    </div>
                  </td>
                  <td className="border border-black p-2 bg-white h-[66mm] align-top">
                    {/* Photo 2 */}
                    <div className="flex flex-col justify-between h-full">
                      <div className="flex-grow flex items-center justify-center overflow-hidden border border-gray-200 rounded bg-gray-50 h-[46mm]">
                        {data.photo2 ? (
                          <img src={data.photo2} alt="사진 2" className="max-h-[42mm] w-auto max-w-full object-contain" />
                        ) : (
                          <div className="text-center text-gray-400 p-2">
                            <p className="text-[13px] font-semibold">사진 미등록</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-center text-[11px] font-bold text-gray-700 bg-gray-100 border border-gray-300 py-0.5 rounded">
                        모니터링 증빙사진 2
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2 bg-white h-[66mm] align-top">
                    {/* Photo 3 */}
                    <div className="flex flex-col justify-between h-full">
                      <div className="flex-grow flex items-center justify-center overflow-hidden border border-gray-200 rounded bg-gray-50 h-[46mm]">
                        {data.photo3 ? (
                          <img src={data.photo3} alt="사진 3" className="max-h-[42mm] w-auto max-w-full object-contain" />
                        ) : (
                          <div className="text-center text-gray-400 p-2">
                            <p className="text-[13px] font-semibold">사진 미등록</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-center text-[11px] font-bold text-gray-700 bg-gray-100 border border-gray-300 py-0.5 rounded">
                        모니터링 증빙사진 3
                      </div>
                    </div>
                  </td>
                  <td className="border border-black p-2 bg-white h-[66mm] align-top">
                    {/* Photo 4 */}
                    <div className="flex flex-col justify-between h-full">
                      <div className="flex-grow flex items-center justify-center overflow-hidden border border-gray-200 rounded bg-gray-50 h-[46mm]">
                        {data.photo4 ? (
                          <img src={data.photo4} alt="사진 4" className="max-h-[42mm] w-auto max-w-full object-contain" />
                        ) : (
                          <div className="text-center text-gray-400 p-2">
                            <p className="text-[13px] font-semibold">사진 미등록</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-center text-[11px] font-bold text-gray-700 bg-gray-100 border border-gray-300 py-0.5 rounded">
                        모니터링 증빙사진 4
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2 bg-white h-[66mm] align-top">
                    {/* Photo 5 */}
                    <div className="flex flex-col justify-between h-full">
                      <div className="flex-grow flex items-center justify-center overflow-hidden border border-gray-200 rounded bg-gray-50 h-[46mm]">
                        {data.photo5 ? (
                          <img src={data.photo5} alt="사진 5" className="max-h-[42mm] w-auto max-w-full object-contain" />
                        ) : (
                          <div className="text-center text-gray-400 p-2">
                            <p className="text-[13px] font-semibold">사진 미등록</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-center text-[11px] font-bold text-gray-700 bg-gray-100 border border-gray-300 py-0.5 rounded">
                        모니터링 증빙사진 5
                      </div>
                    </div>
                  </td>
                  <td className="border border-black p-2 bg-white h-[66mm] align-top">
                    {/* Photo 6 */}
                    <div className="flex flex-col justify-between h-full">
                      <div className="flex-grow flex items-center justify-center overflow-hidden border border-gray-200 rounded bg-gray-50 h-[46mm]">
                        {data.photo6 ? (
                          <img src={data.photo6} alt="사진 6" className="max-h-[42mm] w-auto max-w-full object-contain" />
                        ) : (
                          <div className="text-center text-gray-400 p-2">
                            <p className="text-[13px] font-semibold">사진 미등록</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-center text-[11px] font-bold text-gray-700 bg-gray-100 border border-gray-300 py-0.5 rounded">
                        모니터링 증빙사진 6
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer of Photo Page */}
          <div className="pt-4 mt-auto border-t border-gray-200 text-center">
            <span className="font-bold text-blue-900 text-[17px]">
              서원대학교 평생교육진흥본부
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
