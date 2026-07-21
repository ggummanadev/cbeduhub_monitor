import React, { useState, useRef, useEffect } from 'react';
import { MonitoringReport, initialReport, EVALUATION_QUESTIONS } from './types';
import { InputGroup } from './components/InputGroup';
import { ImageUpload } from './components/ImageUpload';
import { SignaturePad } from './components/SignaturePad';
import { PrintLayout } from './components/PrintLayout';
import { saveReport, fetchAllReports, OperationType, handleFirestoreError, signInWithGoogle, logoutUser, auth, getGoogleAccessToken, setGoogleAccessToken } from './firebase';
import { 
  PlusCircle, 
  Trash2, 
  ChevronRight, 
  FileDown, 
  Edit, 
  Save, 
  FileText, 
  FolderOpen, 
  ArrowLeft, 
  Sparkles,
  ClipboardList,
  CheckCircle,
  HelpCircle,
  Eye,
  Check,
  ShieldAlert,
  EyeOff,
  Lock,
  FileSpreadsheet,
  TrendingUp,
  LogOut,
  Search,
  Calendar,
  UserCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const STORAGE_KEY = 'baeknyeon_monitoring_draft_v1';
const STATE_RESTORE_KEY = 'baeknyeon_monitoring_app_state';

function App() {
  // App states
  const [appMode, setAppMode] = useState<'home' | 'list' | 'editor' | 'preview' | 'admin_login' | 'admin_dashboard'>('home');
  const [deviceId, setDeviceId] = useState<string>('');

  // Admin States
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminError, setAdminError] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('baeknyeon_is_admin') === 'true';
  });
  const [adminSearch, setAdminSearch] = useState<string>('');
  
  // Data State
  const [allReports, setAllReports] = useState<MonitoringReport[]>([]);
  const [data, setData] = useState<MonitoringReport>(initialReport(''));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [listFilter, setListFilter] = useState<'mine' | 'all'>('mine');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Google Drive Submission States
  const [isSubmittingDrive, setIsSubmittingDrive] = useState(false);
  const [driveSubmitSuccess, setDriveSubmitSuccess] = useState<string | null>(null);
  const [driveSubmitError, setDriveSubmitError] = useState<string | null>(null);
  const [currentGoogleUser, setCurrentGoogleUser] = useState<User | null>(null);

  // Monitor Google Auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentGoogleUser(user);
    });
    return () => unsubscribe();
  }, []);
  
  // Derived state: check if there's any active draft content in data
  const hasDraft = !!(
    data.programName?.trim() ||
    data.location?.trim() ||
    data.instructorName?.trim() ||
    data.managerName?.trim() ||
    data.learnerCount?.trim() ||
    data.otherOpinion?.trim() ||
    data.submitterName?.trim() ||
    data.submitterPhone?.trim() ||
    (data.scores && data.scores.some(score => score > 0)) ||
    data.photo1 ||
    data.photo2 ||
    data.photo3 ||
    data.photo4 ||
    data.submitterSign
  );
  
  // Ref for hidden print layout
  const printRef = useRef<HTMLDivElement>(null);

  // --- Initialize device ID and state restore ---
  useEffect(() => {
    // 1. Device ID Setup for anonymous list filtering
    let devId = localStorage.getItem('baeknyeon_device_id');
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('baeknyeon_device_id', devId);
    }
    setDeviceId(devId);

    // 2. Load draft if any
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    let currentDraft: MonitoringReport | null = null;
    if (savedDraft) {
      try {
        currentDraft = JSON.parse(savedDraft);
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }

    // 3. Restore app state
    const savedState = localStorage.getItem(STATE_RESTORE_KEY);
    if (savedState) {
      try {
        const { mode, currentReport } = JSON.parse(savedState);
        if (mode === 'editor' && currentReport) {
          const cachedPhotosStr = localStorage.getItem(`baeknyeon_photos_${currentReport.id}`);
          let merged = { ...currentReport };
          if (cachedPhotosStr) {
            try {
              const cached = JSON.parse(cachedPhotosStr);
              merged = { ...merged, ...cached };
            } catch {}
          }
          setData(merged);
          setAppMode('editor');
        } else if (mode === 'preview' && currentReport) {
          const cachedPhotosStr = localStorage.getItem(`baeknyeon_photos_${currentReport.id}`);
          let merged = { ...currentReport };
          if (cachedPhotosStr) {
            try {
              const cached = JSON.parse(cachedPhotosStr);
              merged = { ...merged, ...cached };
            } catch {}
          }
          setData(merged);
          setAppMode('preview');
        } else if (mode === 'list') {
          setAppMode('list');
          loadReportsFromDB();
        } else if (mode === 'admin_dashboard') {
          setAppMode('admin_dashboard');
          loadReportsFromDB();
        }
      } catch (e) {
        console.error("State restore failed", e);
      }
    } else if (currentDraft) {
      const cachedPhotosStr = localStorage.getItem(`baeknyeon_photos_${currentDraft.id}`);
      let merged = { ...currentDraft };
      if (cachedPhotosStr) {
        try {
          const cached = JSON.parse(cachedPhotosStr);
          merged = { ...merged, ...cached };
        } catch {}
      }
      setData(merged);
    }

    setIsLoaded(true);
  }, []);

  // --- Real-time Local Draft Persistence ---
  useEffect(() => {
    if (isLoaded && (appMode === 'editor' || appMode === 'preview') && data.id) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      // Separately cache photos by report ID to persist across list selections & saves
      if (data.photo1 || data.photo2 || data.photo3 || data.photo4) {
        localStorage.setItem(`baeknyeon_photos_${data.id}`, JSON.stringify({
          photo1: data.photo1,
          photo2: data.photo2,
          photo3: data.photo3,
          photo4: data.photo4,
        }));
      }
    }
  }, [data, appMode, isLoaded]);

  // Save navigation state
  useEffect(() => {
    if (isLoaded) {
      const stateToSave = {
        mode: appMode,
        currentReport: (appMode === 'editor' || appMode === 'preview') ? data : null
      };
      localStorage.setItem(STATE_RESTORE_KEY, JSON.stringify(stateToSave));
    }
  }, [appMode, data, isLoaded]);

  // --- Database Fetching ---
  const loadReportsFromDB = async () => {
    setIsLoadingList(true);
    try {
      const reports = await fetchAllReports();
      setAllReports(reports);
    } catch (e) {
      console.error("Failed to load reports from database:", e);
      alert("데이터베이스에서 보고서를 불러오는데 실패했습니다.");
    } finally {
      setIsLoadingList(false);
    }
  };

  // --- Excel/CSV Data Export ---
  const downloadExcel = () => {
    if (allReports.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    // CSV Header matching evaluation questions
    const headers = [
      "등록ID",
      "작성일시",
      "분류명",
      "방문일시",
      "모니터링 작성자",
      "모니터링 작성자 연락처",
      "프로그램명",
      "강의장소",
      "학습자수(명)",
      "강사 성명",
      "학습매니저/보조강사 성명",
      "종합 평균점수",
      ...EVALUATION_QUESTIONS.map((_, i) => `평가항목 ${i+1}`),
      "기타 의견 및 특이사항"
    ];

    const rows = allReports.map(report => {
      const scoreSum = report.scores.reduce((a, b) => a + (b || 5), 0);
      const avgScore = (scoreSum / 20).toFixed(2);
      const createdAtStr = new Date(report.createdAt).toLocaleString('ko-KR');
      
      return [
        report.id,
        createdAtStr,
        report.category || '백년서원',
        report.visitDate,
        report.submitterName,
        report.submitterPhone || '',
        report.programName,
        report.location,
        report.learnerCount,
        report.instructorName,
        report.managerName,
        avgScore,
        ...report.scores.map(s => s || 5),
        report.otherOpinion ? report.otherOpinion.replace(/"/g, '""').replace(/\n/g, ' ') : ''
      ];
    });

    // Convert to CSV string with double quotes to escape commas and preserve formatting
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Add UTF-8 Byte Order Mark (BOM) so Microsoft Excel opens it perfectly in Korean
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `백년서원_모니터링_보고서_통계_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Action Handlers ---
  const handleGoogleLogin = async () => {
    try {
      setAdminError('');
      const user = await signInWithGoogle();
      const email = user.email ? user.email.toLowerCase().trim() : '';
      
      if (email === 'swrise2025@gmail.com' || email.startsWith('swrise2025@gmail') || email === 'jabang78@gmail.com') {
        setIsAdmin(true);
        sessionStorage.setItem('baeknyeon_is_admin', 'true');
        setAppMode('admin_dashboard');
        loadReportsFromDB();
      } else {
        await logoutUser();
        setAdminError("등록된 시스템 관리자 계정이 아닙니다. 'swrise2025@gmail.com' 계정으로 로그인해 주세요.");
      }
    } catch (e: any) {
      console.error("Google login failed", e);
      if (e?.code !== 'auth/popup-closed-by-user') {
        setAdminError(`구글 로그인에 실패했습니다. (${e instanceof Error ? e.message : String(e)})`);
      }
    }
  };

  const handleNewReport = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STATE_RESTORE_KEY);

    const newReport = initialReport(deviceId);
    newReport.id = 'rep_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    newReport.createdAt = Date.now();
    newReport.lastUpdated = Date.now();
    
    setData(newReport);
    setAppMode('editor');
  };

  const handleShowList = () => {
    setAppMode('list');
    loadReportsFromDB();
  };

  const selectReport = (report: MonitoringReport) => {
    const cachedPhotosStr = localStorage.getItem(`baeknyeon_photos_${report.id}`);
    if (cachedPhotosStr) {
      try {
        const cachedPhotos = JSON.parse(cachedPhotosStr);
        setData({
          ...report,
          ...cachedPhotos
        });
      } catch (e) {
        console.error("Failed to parse cached photos", e);
        setData(report);
      }
    } else {
      setData(report);
    }
    setAppMode('preview');
  };

  const handleSaveAndPreview = async () => {
    try {
      // Validation with optional chaining
      if (!data.programName?.trim()) return alert("프로그램명을 입력해주세요.");
      if (!data.location?.trim()) return alert("강의장소를 입력해주세요.");
      if (!data.visitDate?.trim()) return alert("방문일시를 입력해주세요.");
      if (!data.learnerCount?.trim()) return alert("학습자수를 입력해주세요.");
      if (!data.instructorName?.trim()) return alert("강사 성명을 입력해주세요.");
      if (!data.managerName?.trim()) return alert("학습매니저/보조강사 성명을 입력해주세요.");

      // Validate scores (all 20 must be rated between 1 and 5, cannot be 0)
      const unselectedIndices = [];
      for (let i = 0; i < 20; i++) {
        const score = data.scores[i];
        if (score === undefined || score < 1 || score > 5) {
          unselectedIndices.push(i + 1);
        }
      }
      if (unselectedIndices.length > 0) {
        return alert(`평가 세부사항 중 아직 점수가 선택되지 않은 항목이 있습니다.\n(미선택 항목: ${unselectedIndices.join(', ')}번)`);
      }

      if (!data.submitterName?.trim()) return alert("모니터링 담당자 성명을 입력해주세요.");
      if (!data.submitterSign) return alert("담당자 서명을 등록한 후 저장(완료)해주세요.");

      setIsSaving(true);
      
      // Save directly to Firestore database
      const saved = await saveReport(data);
      
      // Keep photos in active client state so they aren't lost in the UI/preview!
      const updatedData = {
        ...saved,
        photo1: data.photo1,
        photo2: data.photo2,
        photo3: data.photo3,
        photo4: data.photo4,
      };
      setData(updatedData);

      // Explicitly cache photos by this report ID so they persist
      if (data.photo1 || data.photo2 || data.photo3 || data.photo4) {
        localStorage.setItem(`baeknyeon_photos_${data.id}`, JSON.stringify({
          photo1: data.photo1,
          photo2: data.photo2,
          photo3: data.photo3,
          photo4: data.photo4,
        }));
      }
      
      // Clear draft since it is successfully saved to Cloud DB
      localStorage.removeItem(STORAGE_KEY);
      
      // Go to preview
      setAppMode('preview');
    } catch (e) {
      console.error("Failed to save report to database", e);
      alert(`보고서를 데이터베이스에 저장하지 못했습니다.\n오류내용: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- PDF Generation ---
  const generatePDF = async () => {
    if (!printRef.current) return;
    setIsGenerating(true);

    try {
      // Give UI time to update
      await new Promise(resolve => setTimeout(resolve, 400));

      const element = printRef.current;
      const pages = Array.from(element.querySelectorAll('.page-break')) as HTMLElement[];
      
      if (pages.length === 0) {
        throw new Error("출력할 페이지가 없습니다.");
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        
        // Render canvas high-quality
        const canvas = await html2canvas(pages[i], {
          scale: 2.2, // Clean resolution for printing
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 794,  // A4 Standard
          height: 1123, // A4 Standard
          onclone: (clonedDoc) => {
            const el = clonedDoc.querySelector('.print-container') as HTMLElement;
            if (el) {
              el.style.position = 'relative';
              el.style.left = '0';
              el.style.top = '0';
            }
          }
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      const cleanProgramName = data.programName.replace(/[\/\\?%*:|"<>]/g, '_');
      const fileName = `모니터링보고서_${cleanProgramName}_${data.visitDate}.pdf`;
      
      // 1. Save and download standardly
      pdf.save(fileName);
      
      // 2. Automatically execute/open the PDF in a new window/tab as requested
      try {
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
      } catch (e) {
        console.warn("Popup to open PDF was blocked or is not supported inside iframe.", e);
      }

      alert('PDF 파일이 성공적으로 저장 및 다운로드되었습니다!');
    } catch (error) {
      console.error(error);
      alert('PDF 생성 중 오류가 발생했습니다. 모든 이미지가 정상 로드되었는지 확인해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDFBlob = async (): Promise<{ blob: Blob; fileName: string } | null> => {
    if (!printRef.current) return null;

    try {
      // Give offscreen DOM and images enough time to fully load and render
      await new Promise(resolve => setTimeout(resolve, 600));

      const element = printRef.current;
      const pages = Array.from(element.querySelectorAll('.page-break')) as HTMLElement[];
      
      if (pages.length === 0) {
        throw new Error("출력할 페이지가 없습니다.");
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        
        const canvas = await html2canvas(pages[i], {
          scale: 2.2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 794,
          height: 1123,
          onclone: (clonedDoc) => {
            const el = clonedDoc.querySelector('.print-container') as HTMLElement;
            if (el) {
              el.style.position = 'relative';
              el.style.left = '0';
              el.style.top = '0';
            }
          }
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      const cleanProgramName = data.programName.replace(/[\/\\?%*:|"<>]/g, '_');
      const fileName = `모니터링보고서_${cleanProgramName}_${data.visitDate}.pdf`;
      const blob = pdf.output('blob');
      
      return { blob, fileName };
    } catch (e) {
      console.error("generatePDFBlob error", e);
      throw e;
    }
  };

  const submitReportToDrive = async () => {
    setDriveSubmitError(null);
    setDriveSubmitSuccess(null);
    setIsSubmittingDrive(true);

    try {
      let token = getGoogleAccessToken();
      let currentUser = auth.currentUser;

      if (!currentUser || !token) {
        const confirmed = window.confirm(
          "구글 드라이브(swrise2025@gmail.com)에 보고서를 제출하려면 Google 계정 로그인이 필요합니다.\n로그인 창을 여시겠습니까?"
        );
        if (!confirmed) {
          setIsSubmittingDrive(false);
          return;
        }
        
        await signInWithGoogle();
        currentUser = auth.currentUser;
        token = getGoogleAccessToken();
        
        if (!currentUser || !token) {
          throw new Error("구글 로그인에 실패했거나 드라이브 접근 권한 승인이 완료되지 않았습니다.");
        }
      }

      const pdfData = await generatePDFBlob();
      if (!pdfData) {
        throw new Error("PDF 변환용 미리보기 요소를 찾을 수 없습니다.");
      }

      // Unified single-request multipart/related upload to Google Drive v3
      const boundary = 'foo_bar_boundary';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      const metadataPart = JSON.stringify({
        name: pdfData.fileName,
        mimeType: 'application/pdf',
      });

      const arrayBuffer = await pdfData.blob.arrayBuffer();
      const uInt8Array = new Uint8Array(arrayBuffer);

      const part1 = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${metadataPart}${delimiter}Content-Type: application/pdf\r\n\r\n`;
      const part1Array = new TextEncoder().encode(part1);
      const part3Array = new TextEncoder().encode(close_delim);

      const multipartBlob = new Blob([part1Array, uInt8Array, part3Array], {
        type: `multipart/related; boundary=${boundary}`
      });

      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBlob,
      });

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "구글 드라이브 파일 업로드에 실패했습니다.");
      }

      const fileInfo = await uploadRes.json();
      const fileId = fileInfo.id;

      const userEmail = currentUser.email?.toLowerCase().trim() || '';
      const targetEmail = 'swrise2025@gmail.com';
      
      if (userEmail !== targetEmail) {
        const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=true`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'writer',
            type: 'user',
            emailAddress: targetEmail,
          }),
        });

        if (!permRes.ok) {
          const errJson = await permRes.json().catch(() => ({}));
          console.warn("Failed to set file permissions, but file was uploaded.", errJson);
          setDriveSubmitSuccess(`보고서가 회원님의 구글 드라이브에 저장되었으나, swrise2025@gmail.com 계정으로의 공유 중 오류가 발생했습니다. 구글 드라이브에서 직접 공유해주세요.`);
          return;
        }
      }

      setDriveSubmitSuccess(`성공적으로 보고서가 제출되어 'swrise2025@gmail.com' 계정의 구글드라이브에 저장되었습니다!`);
    } catch (e: any) {
      console.error("Failed to submit to Google Drive:", e);
      setDriveSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmittingDrive(false);
    }
  };

  // --- Updaters ---
  const updateField = (key: keyof MonitoringReport, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const updateScore = (index: number, score: number) => {
    setData(prev => {
      const nextScores = [...prev.scores];
      nextScores[index] = score;
      return { ...prev, scores: nextScores };
    });
  };

  // Filter lists based on toggle
  const filteredReports = allReports.filter(report => {
    if (listFilter === 'mine') {
      return report.deviceId === deviceId;
    }
    return true;
  });

  // --- Render Sub-Components ---

  // Renders beautiful 1-5 score rating buttons
  const renderEvaluationRating = (index: number, question: string) => {
    const currentScore = data.scores[index] || 0;
    return (
      <div key={index} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm transition-all hover:border-blue-200">
        <div className="flex gap-2.5 items-start mb-3">
          <span className="bg-blue-100 text-blue-800 text-xs font-extrabold px-2.5 py-1 rounded-full shrink-0">
            {index + 1}
          </span>
          <p className="text-sm font-semibold text-gray-800 leading-snug">{question}</p>
        </div>
        
        {/* Beautiful Selector Buttons */}
        <div className="grid grid-cols-5 gap-2 mt-2">
          {[1, 2, 3, 4, 5].map((score) => {
            const isSelected = currentScore === score;
            return (
              <button
                key={score}
                type="button"
                onClick={() => updateScore(index, score)}
                className={`py-2 text-center text-sm font-bold rounded-lg transition-all border cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-[1.03]' 
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {score}점
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans flex flex-col pb-10">
      
      {/* HEADER BAR */}
      <header className="bg-blue-800 text-white py-4 px-4 sticky top-0 z-30 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ClipboardList size={22} className="text-blue-200" />
          <h1 className="text-lg font-bold tracking-tight">백년서원 모니터링 시스템</h1>
        </div>
        {appMode !== 'home' && (
          <button 
            onClick={() => {
              setAppMode('home');
            }} 
            className="text-xs bg-blue-900 border border-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-950 transition-colors cursor-pointer"
          >
            홈으로
          </button>
        )}
      </header>

      {/* MAIN CONTAINER */}
      <main className={`flex-grow w-full mx-auto p-4 flex flex-col justify-start transition-all ${
        appMode === 'admin_dashboard' ? 'max-w-5xl' : 'max-w-2xl'
      }`}>
        
        {/* 1. HOME SCREEN */}
        {appMode === 'home' && (
          <div className="flex-grow flex flex-col items-center justify-center py-10 px-2">
            <div className="text-center mb-6 max-w-md">
              <div className="inline-block bg-blue-50 p-4 rounded-full mb-4 shadow-sm border border-blue-100">
                <Sparkles size={48} className="text-blue-700 animate-pulse" />
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">프로그램 모니터링 보고서</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                서원대학교 평생교육진흥본부 프로그램의 평가, 사진 대지 및 현장 보고서를 작성하고 클라우드에 실시간 저장 및 PDF 다운로드를 관리합니다.
              </p>
            </div>

            {/* Photo Privacy Notice Card */}
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 mb-6 text-xs leading-relaxed max-w-md text-left flex gap-3 shadow-sm">
              <EyeOff size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 mb-0.5">안전한 로컬 사진 첨부 안내 (DB 비저장)</p>
                <p className="text-amber-700">
                  작성하시는 모니터링 사진(4장)은 개인정보 보호 및 서버 용량 최소화를 위해 <span className="font-bold underline">클라우드 데이터베이스에 전송되거나 저장되지 않습니다.</span> 사진은 현재 기기 브라우저 메모리에만 일시 보관되며, PDF 생성 시 문서에 자동 탑재되어 즉시 안전하게 다운로드됩니다.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 w-full max-w-md">
              {hasDraft ? (
                <>
                  <button 
                    onClick={() => setAppMode('editor')}
                    className="bg-white p-6 rounded-2xl shadow-sm border-2 border-blue-500 hover:shadow-md transition-all flex flex-col items-center group cursor-pointer text-center relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl">
                      작성 중
                    </div>
                    <div className="bg-blue-50 p-3.5 rounded-full mb-3 group-hover:bg-blue-600 transition-colors">
                      <Sparkles size={28} className="text-blue-600 group-hover:text-white" />
                    </div>
                    <span className="text-base font-bold text-slate-800">작성 중인 보고서 이어쓰기</span>
                    <span className="text-xs text-slate-400 mt-1">이전에 입력하던 내용을 이어서 작성합니다.</span>
                  </button>

                  {showClearConfirm ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-3 shadow-sm">
                      <p className="text-xs font-bold text-red-800 leading-normal">
                        정말 작성 중인 보고서를 지우고 새로 작성하시겠습니까?<br />
                        <span className="font-medium text-red-600 text-[11px]">(기존 작성 중이던 임시 저장본이 모두 삭제됩니다)</span>
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setShowClearConfirm(false);
                            handleNewReport();
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold py-2 px-3 rounded-lg transition-colors cursor-pointer"
                        >
                          네, 새로 작성
                        </button>
                        <button
                          onClick={() => setShowClearConfirm(false)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-extrabold py-2 px-3 rounded-lg transition-colors cursor-pointer"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowClearConfirm(true)}
                      className="bg-white py-3 px-4 rounded-xl border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 hover:bg-red-50/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs font-bold shadow-sm"
                    >
                      <PlusCircle size={14} /> 작성 중인 보고서 지우고 새로 작성
                    </button>
                  )}
                </>
              ) : (
                <button 
                  onClick={handleNewReport}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col items-center group cursor-pointer text-center"
                >
                  <div className="bg-blue-50 p-3.5 rounded-full mb-3 group-hover:bg-blue-600 transition-colors">
                    <PlusCircle size={28} className="text-blue-600 group-hover:text-white" />
                  </div>
                  <span className="text-base font-bold text-slate-800">신규 모니터링 보고서 작성</span>
                  <span className="text-xs text-slate-400 mt-1">현장 평가 5점 척도, 사진 첨부 및 서명</span>
                </button>
              )}

              <button 
                onClick={handleShowList}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col items-center group cursor-pointer text-center"
              >
                <div className="bg-emerald-50 p-3.5 rounded-full mb-3 group-hover:bg-emerald-600 transition-colors">
                  <FolderOpen size={28} className="text-emerald-600 group-hover:text-white" />
                </div>
                <span className="text-base font-bold text-slate-800">모니터링 보고서 보관함</span>
                <span className="text-xs text-slate-400 mt-1">이전에 제출 및 저장된 클라우드 보고서 목록</span>
              </button>
            </div>

            {/* Admin Entrance */}
            <div className="mt-8 border-t border-slate-200/70 pt-5 w-full max-w-md text-center">
              <button
                onClick={() => {
                  if (isAdmin) {
                    setAppMode('admin_dashboard');
                    loadReportsFromDB();
                  } else {
                    setAppMode('admin_login');
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 font-semibold transition-colors cursor-pointer"
              >
                <ShieldAlert size={14} /> 시스템 관리자 로그인 (Admin Mode)
              </button>
            </div>
          </div>
        )}

        {/* 2. LIST SCREEN */}
        {appMode === 'list' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setAppMode('home')} 
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-lg font-bold text-slate-800">모니터링 보고서 목록</h2>
              </div>
              <button 
                onClick={handleNewReport}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle size={14} /> 신규 작성
              </button>
            </div>

            {/* Filter Toggle tabs (Mine vs All) */}
            <div className="bg-slate-200/60 p-1 rounded-xl grid grid-cols-2 text-center text-xs font-bold mb-4">
              <button 
                onClick={() => setListFilter('mine')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${listFilter === 'mine' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}
              >
                내가 작성한 보고서
              </button>
              <button 
                onClick={() => setListFilter('all')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${listFilter === 'all' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}
              >
                전체 보고서 목록
              </button>
            </div>

            {isLoadingList ? (
              <div className="text-center py-20 text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                클라우드에서 보고서 목록을 가져오는 중...
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                등록된 보고서가 없습니다. <br /> 새 보고서를 작성해 주십시오.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => (
                  <div 
                    key={report.id} 
                    onClick={() => selectReport(report)}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-blue-400 hover:shadow transition-all cursor-pointer flex justify-between items-center"
                  >
                    <div className="space-y-1 pr-4 truncate flex-grow">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-50 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded border border-blue-100">
                          {report.visitDate}
                        </span>
                        <span className="bg-slate-50 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded border border-slate-200">
                          {report.category || '백년서원'}
                        </span>
                        {report.deviceId === deviceId && (
                          <span className="bg-emerald-50 text-emerald-700 font-bold text-[10px] px-1.5 py-0.5 rounded border border-emerald-100">
                            내 보고서
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-800 truncate">{report.programName}</h3>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 font-medium">
                        <span>장소: {report.location || '-'}</span>
                        <span>강사: {report.instructorName || '-'}</span>
                        <span>매니저: {report.managerName || '-'}</span>
                        <span>평가자: {report.submitterName || '-'}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. EDITOR VIEW */}
        {appMode === 'editor' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setAppMode('home');
                  }} 
                  className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-lg font-black text-slate-800">모니터링 보고서 작성</h2>
              </div>
            </div>

            {/* Step Content: Basic Info */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-blue-700 border-b pb-1.5 flex items-center gap-1.5">
                <HelpCircle size={16} /> 1. 기본 현장 정보
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">분류명</label>
                  <select
                    value={data.category || '백년서원'}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-shadow shadow-sm"
                  >
                    <option value="백년서원">백년서원</option>
                    <option value="AI디지털칼리지">AI디지털칼리지</option>
                    <option value="다문화인재양성">다문화인재양성</option>
                  </select>
                </div>
                <InputGroup 
                  label="프로그램명" 
                  value={data.programName} 
                  onChange={(v) => updateField('programName', v)} 
                  placeholder="예: AI 리터러시 교육" 
                />
                <InputGroup 
                  label="강의장소" 
                  value={data.location} 
                  onChange={(v) => updateField('location', v)} 
                  placeholder="예: 서원대학교 평생학습관 201호" 
                />
                <InputGroup 
                  label="방문일시" 
                  value={data.visitDate} 
                  type="date" 
                  onChange={(v) => updateField('visitDate', v)} 
                />
                <InputGroup 
                  label="학습자수 (명)" 
                  value={data.learnerCount} 
                  onChange={(v) => updateField('learnerCount', v)} 
                  placeholder="예: 15" 
                />
                <InputGroup 
                  label="강사 성명" 
                  value={data.instructorName} 
                  onChange={(v) => updateField('instructorName', v)} 
                  placeholder="예: 이순신" 
                />
                <InputGroup 
                  label="학습매니저/보조강사 성명" 
                  value={data.managerName} 
                  onChange={(v) => updateField('managerName', v)} 
                  placeholder="예: 김좌진" 
                />
              </div>
            </section>

            {/* Step Content: Evaluation Detail Questions */}
            <section className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-extrabold text-blue-700 border-b pb-1.5 flex items-center gap-1.5">
                  <CheckCircle size={16} /> 2. 모니터링 평가 세부사항 (5점 만점)
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  각 항목에 알맞은 현장 평가 점수를 선택해 주십시오. (기본 5점 설정)
                </p>
              </div>

              <div className="space-y-3.5">
                {EVALUATION_QUESTIONS.map((question, index) => renderEvaluationRating(index, question))}
              </div>
            </section>

            {/* Step Content: Other opinions */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-blue-700 border-b pb-1.5 flex items-center gap-1.5">
                <FileText size={16} /> 3. (기타 의견) 및 특이사항
              </h3>
              <InputGroup 
                label="모니터링 의견 요약" 
                value={data.otherOpinion} 
                onChange={(v) => updateField('otherOpinion', v)} 
                multiline 
                placeholder="참여 학습자들의 강의 만족도, 시설 상태, 추가 요구사항 등을 자유롭게 기재해주세요." 
              />
            </section>

            {/* Step Content: Photos Attachment */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-blue-700 border-b pb-1.5 flex items-center gap-1.5">
                <Eye size={16} /> 4. 모니터링 현장 사진 첨부 (A4 한 장에 4장 부착)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                스마트폰 카메라로 직접 촬영하거나 갤러리에서 사진을 선택해주세요. 각 슬롯의 조건에 맞는 사진을 권장합니다.
              </p>

              <div className="space-y-4">
                <ImageUpload 
                  label="1. 강사 앞모습과 학습자 뒷모습 모두 보이는 사진"
                  imageData={data.photo1}
                  onImageChange={(img) => updateField('photo1', img)}
                  existingFileNames={[]}
                />
                <ImageUpload 
                  label="2. 강사 앞모습과 강사 교안이 모두 보이는 사진"
                  imageData={data.photo2}
                  onImageChange={(img) => updateField('photo2', img)}
                  existingFileNames={[]}
                />
                <ImageUpload 
                  label="3. 학습매니저(보조강사) 앞모습과 학습자 뒷모습 모두 보이는 사진"
                  imageData={data.photo3}
                  onImageChange={(img) => updateField('photo3', img)}
                  existingFileNames={[]}
                />
                <ImageUpload 
                  label="4. 학습매니저(보조강사)가 학습자 도움을 주고 있는 사진"
                  imageData={data.photo4}
                  onImageChange={(img) => updateField('photo4', img)}
                  existingFileNames={[]}
                />
              </div>
            </section>

            {/* Step Content: Submitter Signatures */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-blue-700 border-b pb-1.5 flex items-center gap-1.5">
                <Save size={16} /> 5. 보고자 서명 등록
              </h3>
              
              <InputGroup 
                label="모니터링 담당자 성명" 
                value={data.submitterName} 
                onChange={(v) => updateField('submitterName', v)} 
                placeholder="예: 홍길동" 
              />

              <InputGroup 
                label="모니터링 담당자 연락처" 
                value={data.submitterPhone || ''} 
                onChange={(v) => updateField('submitterPhone', v)} 
                placeholder="예: 010-1234-5678" 
              />

              <SignaturePad 
                label="화면 터치 후 정자로 이름 서명" 
                signatureData={data.submitterSign} 
                onSave={(sig) => updateField('submitterSign', sig)} 
              />
            </section>

            {/* SUBMIT BUTTON */}
            <div className="pt-2 text-center">
              <button 
                onClick={handleSaveAndPreview}
                disabled={isSaving}
                className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                  isSaving ? 'bg-slate-400 cursor-not-allowed animate-pulse' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                }`}
              >
                {isSaving ? "데이터베이스 저장 중..." : <>저장 후 미리보기 <ChevronRight size={18} /></>}
              </button>
              <p className="text-xs text-slate-400 mt-2.5">
                ※ 저장 완료 시 보고서가 클라우드 데이터베이스에 실시간으로 보관됩니다.
              </p>
            </div>
          </div>
        )}

        {/* 4. PREVIEW & PDF SUBMIT VIEW */}
        {appMode === 'preview' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded border border-blue-100">제출 및 미리보기</span>
                  <h2 className="text-xl font-black text-slate-800 mt-2">{data.programName || '(프로그램명 없음)'}</h2>
                </div>
                <button 
                  onClick={() => setAppMode('editor')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit size={12} /> 수정하기
                </button>
              </div>

              <div className="text-xs text-slate-500 space-y-2 py-1.5 font-medium">
                <div className="flex justify-between border-b pb-1 border-dashed">
                  <span className="text-slate-400">강의장소</span>
                  <span className="font-bold text-slate-800">{data.location}</span>
                </div>
                <div className="flex justify-between border-b pb-1 border-dashed">
                  <span className="text-slate-400">방문일시</span>
                  <span className="font-bold text-slate-800">{data.visitDate}</span>
                </div>
                <div className="flex justify-between border-b pb-1 border-dashed">
                  <span className="text-slate-400">학습자 수</span>
                  <span className="font-bold text-slate-800">{data.learnerCount}명</span>
                </div>
                <div className="flex justify-between border-b pb-1 border-dashed">
                  <span className="text-slate-400">강사 / 보조강사</span>
                  <span className="font-bold text-slate-800">{data.instructorName} / {data.managerName}</span>
                </div>
                <div className="flex justify-between border-b pb-1 border-dashed">
                  <span className="text-slate-400">평가 담당자</span>
                  <span className="font-bold text-slate-800">{data.submitterName} {data.submitterSign ? '(서명완료)' : '(서명미필)'}</span>
                </div>
                {data.submitterPhone && (
                  <div className="flex justify-between border-b pb-1 border-dashed">
                    <span className="text-slate-400">담당자 연락처</span>
                    <span className="font-bold text-slate-800">{data.submitterPhone}</span>
                  </div>
                )}
              </div>

              {/* Generate PDF Button */}
              <button 
                onClick={generatePDF}
                disabled={isGenerating}
                className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                  isGenerating ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'
                }`}
              >
                {isGenerating ? (
                  <span className="flex items-center gap-1.5"><FileText size={18} className="animate-spin" /> PDF 보고서 만드는 중...</span>
                ) : (
                  <>
                    <FileDown size={18} /> PDF 문서로 저장 및 열기
                  </>
                )}
              </button>
              
              <p className="text-xs text-slate-400 text-center leading-relaxed mt-2">
                저장된 PDF 파일은 **기기에 다운로드**되며 <br />
                모바일 화면에서 **자동으로 실행**되어 즉시 확인할 수 있습니다.
              </p>
            </div>

            {/* Real PDF Layout Preview Section */}
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 shadow-inner space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye size={16} className="text-indigo-600" /> 실제 제출용 PDF 문서 미리보기
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-white border px-2 py-0.5 rounded-full">A4 표준 레이아웃</span>
              </div>
              
              <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md">
                <div className="max-w-full overflow-x-auto p-4 md:p-6 bg-slate-200/50 flex justify-start lg:justify-center">
                  <div className="shadow-2xl bg-white origin-top" style={{ minWidth: '210mm' }}>
                    <PrintLayout data={data} isPreview={true} />
                  </div>
                </div>
              </div>
              
              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                ※ 위 화면은 최종 저장 및 제출 시 생성되는 A4 인쇄 규격의 PDF 실시간 레이아웃입니다.<br />
                화면 너비가 좁을 경우 좌우 스크롤을 통해 전체 페이지를 확인할 수 있습니다.
              </p>
            </div>

            {/* Simulated Live Preview Card for On-screen feedback */}
            <div className="bg-slate-800 text-white p-4 rounded-2xl shadow-inner space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Check size={12} className="text-indigo-400" /> 실시간 모니터링 입력 점수 검토
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-3 rounded-xl max-h-[150px] overflow-y-auto">
                {EVALUATION_QUESTIONS.map((q, i) => (
                  <div key={i} className="flex justify-between border-b border-slate-800 py-1 pr-1.5">
                    <span className="text-slate-400 truncate max-w-[160px]">{i + 1}. {q}</span>
                    <span className="font-black text-indigo-300">{data.scores[i] || 5}점</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Guide details */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-xs text-blue-800 space-y-2">
              <p className="font-bold flex items-center gap-1 text-sm"><CheckCircle size={14} /> 모니터링 보고서 전송 안내</p>
              <p className="leading-relaxed">
                다운로드한 PDF 파일을 아래 서원대학교 평생교육진흥본부 담당팀 메일로 첨부하여 제출하여 주시기 바랍니다.
              </p>
              <div className="pt-2 border-t border-blue-200">
                <span className="font-semibold block text-[10px] text-blue-500">제출처 이메일</span>
                <a href="mailto:swrise2025@gmail.com" className="text-sm font-black underline hover:text-blue-950">
                  swrise2025@gmail.com
                </a>
              </div>
            </div>

            {/* Google Drive Submission Section */}
            <div id="drive-submission-section" className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-600 text-white p-1.5 rounded-lg">
                  <FolderOpen size={18} />
                </span>
                <div>
                  <h3 className="font-black text-slate-800 text-sm leading-tight">서원대학교 평생교육원 구글 드라이브 제출</h3>
                  <p className="text-[10px] text-indigo-600 font-bold mt-0.5">Google Drive Direct Submission</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                '보고서 제출' 버튼을 누르면 로그인한 구글 계정을 통해 서원대학교 평생교육진흥본부(<span className="font-semibold text-slate-800">swrise2025@gmail.com</span>)의 구글 드라이브로 보고서 PDF 파일이 즉시 자동 전송 및 저장됩니다.
              </p>

              {currentGoogleUser ? (
                <div className="flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    {currentGoogleUser.photoURL ? (
                      <img src={currentGoogleUser.photoURL} alt="Profile" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">G</span>
                    )}
                    <div>
                      <p className="font-bold text-slate-800">{currentGoogleUser.displayName || 'Google 사용자'}</p>
                      <p className="text-[10px] text-slate-400">{currentGoogleUser.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      await logoutUser();
                      setGoogleAccessToken(null);
                    }}
                    className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-amber-600 font-medium bg-amber-50 border border-amber-100 p-2.5 rounded-xl">
                  ※ 제출을 위해 본인의 Google 계정 인증 및 드라이브 저장 권한 승인이 필요합니다.
                </p>
              )}

              {/* Submit to Drive Button */}
              <button 
                onClick={submitReportToDrive}
                disabled={isSubmittingDrive}
                className={`w-full py-4 rounded-xl font-black text-white text-lg flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                  isSubmittingDrive ? 'bg-slate-400 cursor-not-allowed animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'
                }`}
              >
                {isSubmittingDrive ? (
                  <span className="flex items-center gap-2"><FolderOpen size={20} className="animate-spin" /> 구글 드라이브로 제출 중...</span>
                ) : (
                  <>
                    <FolderOpen size={20} /> 보고서 제출 (swrise2025@gmail.com)
                  </>
                )}
              </button>

              {/* Success/Error Alerts */}
              {driveSubmitSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                  <p className="font-bold flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-600" /> 제출 성공!</p>
                  <p className="leading-relaxed">{driveSubmitSuccess}</p>
                </div>
              )}

              {driveSubmitError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                  <p className="font-bold flex items-center gap-1.5"><ShieldAlert size={14} className="text-rose-600" /> 제출 실패</p>
                  <p className="leading-relaxed">{driveSubmitError}</p>
                  <p className="text-[10px] text-rose-500 font-medium">※ 다시 시도해주시거나 로그인 계정을 확인해 주세요.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. ADMIN LOGIN SCREEN */}
        {appMode === 'admin_login' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg space-y-6 max-w-md mx-auto my-12 w-full">
            <div className="text-center">
              <div className="inline-block bg-blue-50 p-3.5 rounded-full mb-3">
                <Lock size={32} className="text-blue-700" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 font-sans tracking-tight">시스템 관리자 로그인</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
                모니터링 보고서 데이터 및 엑셀 다운로드를 위한 통합 대시보드
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-sm hover:shadow transition-all cursor-pointer"
              >
                {/* Google "G" Icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google 계정으로 로그인
              </button>

              {adminError && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-xs font-semibold leading-relaxed text-center">
                  {adminError}
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  onClick={() => setAppMode('home')}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold transition-colors cursor-pointer"
                >
                  이전 화면으로 돌아가기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. ADMIN DASHBOARD VIEW */}
        {appMode === 'admin_dashboard' && (
          <div className="space-y-6 w-full">
            {/* Header / Stats row */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-full border border-blue-100 flex items-center gap-1">
                    <UserCheck size={12} /> swrise2025@gmail.com
                  </span>
                  <span className="bg-slate-100 text-slate-700 font-bold text-xs px-2 py-1 rounded">
                    시스템 관리자 모드
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-800 mt-2">모니터링 종합 분석 대시보드</h2>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={downloadExcel}
                  className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={15} /> 엑셀 파일 다운로드
                </button>
                <button
                  onClick={() => {
                    setIsAdmin(false);
                    sessionStorage.removeItem('baeknyeon_is_admin');
                    setAppMode('home');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut size={15} /> 로그아웃
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                  <ClipboardList size={22} />
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-bold block">총 제출 보고서</span>
                  <span className="text-2xl font-black text-slate-800">{allReports.length}건</span>
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-bold block">종합 만족도 평균</span>
                  <span className="text-2xl font-black text-slate-800 font-mono">
                    {allReports.length > 0 
                      ? (allReports.reduce((acc, r) => acc + (r.scores.reduce((a, b) => a + (b || 5), 0) / 20), 0) / allReports.length).toFixed(2) 
                      : '0.00'
                    } / 5.0
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                  <UserCheck size={22} />
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-bold block">활동 모니터링 요원</span>
                  <span className="text-2xl font-black text-slate-800">{new Set(allReports.map(r => r.submitterName).filter(Boolean)).size}명</span>
                </div>
              </div>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-1.5 text-sm">
                  <ClipboardList size={16} className="text-blue-600" /> 제출 모니터링 목록 및 점수 현황
                </h3>
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    placeholder="프로그램명, 강사명, 작성자 검색..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                      <th className="py-3 px-4 font-extrabold">방문일시</th>
                      <th className="py-3 px-4 font-extrabold">모니터링 작성자</th>
                      <th className="py-3 px-4 font-extrabold">분류명</th>
                      <th className="py-3 px-4 font-extrabold">프로그램명</th>
                      <th className="py-3 px-4 font-extrabold text-center">평가점수 (평균)</th>
                      <th className="py-3 px-4 font-extrabold">강사명</th>
                      <th className="py-3 px-4 font-extrabold">보조강사/매니저</th>
                      <th className="py-3 px-4 font-extrabold text-center">동작</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingList ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-400">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          데이터 로딩 중...
                        </td>
                      </tr>
                    ) : allReports.filter(r => {
                      const q = adminSearch.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        r.programName?.toLowerCase().includes(q) ||
                        r.instructorName?.toLowerCase().includes(q) ||
                        r.managerName?.toLowerCase().includes(q) ||
                        r.submitterName?.toLowerCase().includes(q) ||
                        r.submitterPhone?.toLowerCase().includes(q) ||
                        r.location?.toLowerCase().includes(q) ||
                        r.category?.toLowerCase().includes(q)
                      );
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-400">
                          검색 조건에 맞는 보고서가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      allReports.filter(r => {
                        const q = adminSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          r.programName?.toLowerCase().includes(q) ||
                          r.instructorName?.toLowerCase().includes(q) ||
                          r.managerName?.toLowerCase().includes(q) ||
                          r.submitterName?.toLowerCase().includes(q) ||
                          r.submitterPhone?.toLowerCase().includes(q) ||
                          r.location?.toLowerCase().includes(q) ||
                          r.category?.toLowerCase().includes(q)
                        );
                      }).map((report) => {
                        const scoreSum = report.scores.reduce((a, b) => a + (b || 5), 0);
                        const avgScore = (scoreSum / 20).toFixed(2);
                        return (
                          <tr key={report.id} className="hover:bg-slate-50/55 transition-colors">
                            <td className="py-3.5 px-4 font-medium text-slate-600">
                              <div className="flex items-center gap-1">
                                <Calendar size={12} className="text-slate-400" /> {report.visitDate}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-800">{report.submitterName}</td>
                            <td className="py-3.5 px-4">
                              <span className="bg-slate-50 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                                {report.category || '백년서원'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[180px] truncate">{report.programName}</td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1">
                                <span className="bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded text-[10px] border border-blue-100">
                                  평균 {avgScore}점
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-700">{report.instructorName}</td>
                            <td className="py-3.5 px-4 font-medium text-slate-700">{report.managerName || '-'}</td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => selectReport(report)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              >
                                보기/인쇄
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* HIDDEN PRINT LAYOUT COMPONENT FOR PDF GENERATION */}
      <PrintLayout data={data} printRef={printRef} />

    </div>
  );
}

export default App;
