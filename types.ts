export interface EvaluationItem {
  id: number;
  question: string;
}

export interface MonitoringReport {
  id: string; // Unique document ID
  createdAt: number;
  lastUpdated: number;
  deviceId?: string; // Local storage identifier for filtering "My Reports"
  
  category: string; // 분류명 (백년서원 | AI디지털칼리지 | 다문화인재양성)
  programName: string; // 프로그램명
  location: string; // 강의장소
  visitDate: string; // 방문일시
  learnerCount: string; // 학습자수 (명)
  instructorName: string; // 강사명
  managerName: string; // 학습매니저명 (또는 보조강사)
  
  scores: number[]; // 20개의 평가 항목 점수 (1~5점)
  otherOpinion: string; // (기타 의견)
  
  submitterName: string; // 모니터링 담당자 성명
  submitterPhone?: string; // 모니터링 담당자 연락처 (전화번호)
  submitterSign: string | null; // 모니터링 담당자 서명 (Base64)
  
  // 4 Photos required
  photo1: string | null; // 1. 강사 앞모습과 학습자 뒷모습 모두 보이는 사진
  photo2: string | null; // 2. 강사 앞모습과 강사 교안이 모두 보이는 사진
  photo3: string | null; // 3. 학습매니저(보조강사) 앞모습과 학습자 뒷모습이 모두 보이는 사진
  photo4: string | null; // 4. 학습매니저(보조강사) 가 학습자 도움을 주고 있는 사진
}

export const EVALUATION_QUESTIONS = [
  "세부내용(커리큘럼)은 교육 목적에 맞게 적절하게 구성되었는가?",
  "교육과정은 학습자가 학습목표 달성에 도움이 되도록 운영되고 있는가?",
  "교육 운영에 있어 매니저(보조강사)와 강사 간 소통은 원활한가?",
  "학습자의 교육과정 만족도 수준은 어떠한가?",
  "다양한 강의기법 도구(교재, 시청각 자료 등)의 활용은 적절한가?",
  "강의 중에 핵심 내용이 잘 부각 되는가?",
  "설득력 있는 강의를 진행으로 전문성이 느껴지는가?",
  "적절한 학습 분위기를 잘 조성하는가?",
  "강의목차(커리큘럼)에 따라 강의가 진행되었는가?",
  "강의시간 준수 여부(휴식시간, 강의시작 및 강의종료 시간)",
  "학습자의 이해도를 고려하여 수업을 진행하는가?",
  "학습자의 의사를 존중하고 학습자가 참여할 기회를 주는가?",
  "학습자에게 질문 시간을 주고 성실하고 친절하게 답변하는가?",
  "학습 신청인원 대비 출석율을 점검하는가?",
  "학습자의 학습성과(학습목표 달성, 결과물 도출 등) 달성이 기대되는가?",
  "프로그램 운영 전반에 대한 개선요청을 반영하고 있는가?",
  "학습자 몰입도 정도가 우수한가?(수업에의 집중도 및 수강생 호응도)",
  "프로그램 활동 내용에 적합한 운영 공간을 활용하고 있는가?",
  "프로그램에 필요한 물품/시설 관리가 잘 되어있는가?",
  "프로그램 운영 과정의 안전관리는 충분히 이루어지고 있는가?"
];

export const initialReport = (deviceId: string = ''): MonitoringReport => ({
  id: '',
  createdAt: 0,
  lastUpdated: 0,
  deviceId,
  category: '백년서원',
  programName: '',
  location: '',
  visitDate: new Date().toISOString().split('T')[0],
  learnerCount: '',
  instructorName: '',
  managerName: '',
  scores: Array(20).fill(0), // Default to 0 points (unselected)
  otherOpinion: '',
  submitterName: '',
  submitterPhone: '',
  submitterSign: null,
  photo1: null,
  photo2: null,
  photo3: null,
  photo4: null
});
