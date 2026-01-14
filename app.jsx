import React, { useState, useEffect } from 'react';
import { Menu, X, Mail, Phone, MapPin, Award, BookOpen, GraduationCap, FileText, Globe, Users, ChevronRight, Loader } from 'lucide-react';

// ==========================================
// CSV 解析工具與設定 (UTILITIES & CONFIG)
// ==========================================

// 定義 CSV 檔案路徑與對應的資料欄位
// 請在你的專案 public/data/ 資料夾下建立對應的 .csv 檔案
const DATA_SOURCES = {
  info: 'data/info.csv',                     // 實驗室基本資訊 (name, englishName, description, location, email, phone)
  professor: 'data/professor.csv',           // 教授個資 (name, title, image_filename) *image_filename 只要檔名
  education: 'data/education.csv',           // 學歷 (year, degree, school)
  experience_main: 'data/experience_main.csv', // 主要經歷 (period, title, org)
  experience_related: 'data/experience_related.csv', // 相關經歷 (period, title, org)
  honors: 'data/honors.csv',                 // 榮譽 (year, title, date)
  patents: 'data/patents.csv',               // 專利 (year, title, region, number, date)
  conference_intl: 'data/conference_intl.csv', // 國際研討會 (year, title, conference, location, date)
  conference_dom: 'data/conference_dom.csv',   // 國內研討會 (year, title, conference, location, date)
  projects: 'data/projects.csv',             // 研究計畫 (year, title, agency, role, date)
  activity_photos: 'data/activity_photos.csv'  // 活動照片 (id, filename, caption) *filename 只要檔名
};

// 簡單的 CSV 解析器 (支援逗號分隔與雙引號包夾內容)
const parseCSV = (text) => {
  const lines = text.trim().split(/\r\n|\n/);
  if (lines.length < 2) return []; // 只有標題或空的

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // 正規表達式處理：依逗號分割，但忽略雙引號內的逗號
  const pattern = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

  return lines.slice(1).map(line => {
    // 忽略空行
    if (!line.trim()) return null;
    
    const values = line.split(pattern).map(val => {
      // 移除頭尾引號與空白
      return val ? val.trim().replace(/^"|"$/g, '').replace(/""/g, '"') : '';
    });

    return headers.reduce((obj, header, index) => {
      obj[header] = values[index] || '';
      return obj;
    }, {});
  }).filter(item => item !== null);
};

// ==========================================
// 應用程式邏輯區 (LOGIC SECTION)
// ==========================================

export default function App() {
  const [currentPage, setPage] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 初始資料結構 (Loading 時顯示的空狀態)
  const [labData, setLabData] = useState({
    info: {},
    professor: {},
    education: [],
    experience_main: [],
    experience_related: [],
    honors: [],
    patents: [],
    conference_intl: [],
    conference_dom: [],
    projects: [],
    activity_photos: []
  });

  // 抓取所有 CSV 資料
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const fetchPromises = Object.entries(DATA_SOURCES).map(async ([key, url]) => {
          try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Missing ${url}`);
            const text = await response.text();
            const parsedData = parseCSV(text);
            
            // 特殊處理：info 和 professor 是單一物件，不是陣列
            if (key === 'info' || key === 'professor') {
              return { [key]: parsedData[0] || {} };
            }
            return { [key]: parsedData };
          } catch (err) {
            console.warn(`Failed to load ${key}:`, err);
            return { [key]: [] }; // 失敗時回傳空陣列避免崩潰
          }
        });

        const results = await Promise.all(fetchPromises);
        const newLabData = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        
        // 圖片路徑處理
        if (newLabData.professor && newLabData.professor.image_filename) {
          newLabData.professor.image = `photos/prof/${newLabData.professor.image_filename}`;
        } else {
          newLabData.professor.image = "/api/placeholder/400/400"; // 預設圖
        }

        if (newLabData.activity_photos) {
          newLabData.activity_photos = newLabData.activity_photos.map(p => ({
            ...p,
            url: `photos/activity/${p.filename}`
          }));
        }

        setLabData(prev => ({ ...prev, ...newLabData }));
        setLoading(false);
      } catch (err) {
        setError("無法讀取資料，請確認 CSV 檔案是否位於 public/data/ 資料夾內。");
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // 輔助函式：從所有資料中提取最新消息
  const getLatestNews = () => {
    if (loading) return [];
    
    const allItems = [
      ...(labData.honors || []).map(i => ({ ...i, type: '榮譽', category: 'honor' })),
      ...(labData.patents || []).map(i => ({ ...i, type: '專利', category: 'patent' })),
      ...(labData.conference_intl || []).map(i => ({ ...i, type: '國際研討會', category: 'conf_intl' })),
      ...(labData.conference_dom || []).map(i => ({ ...i, type: '國內研討會', category: 'conf_dom' })),
      ...(labData.projects || []).map(i => ({ ...i, type: '研究計畫', category: 'project' }))
    ];
    
    // 依日期排序 (新到舊) 並取前 6 筆
    // 確保 date 欄位存在才排序，否則可能會亂
    return allItems
      .filter(item => item.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="animate-spin w-10 h-10 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">正在讀取實驗室資料...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  // --- Components ---

  const Navigation = () => {
    const links = [
      { id: 'home', text: '首頁' },
      { id: 'professor', text: '主持人簡介' },
      { id: 'research', text: '研究成果' },
    ];

    return (
      <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div 
              className="font-bold text-xl cursor-pointer flex items-center gap-2"
              onClick={() => setPage('home')}
            >
              <Users className="w-6 h-6 text-blue-400" />
              <span className="hidden sm:block">{labData.info.name || "載入中..."}</span>
              <span className="sm:hidden">Lab</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-8">
              {links.map(link => (
                <button
                  key={link.id}
                  onClick={() => setPage(link.id)}
                  className={`transition-colors hover:text-blue-400 ${currentPage === link.id ? 'text-blue-400 font-bold border-b-2 border-blue-400' : 'text-gray-300'}`}
                >
                  {link.text}
                </button>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden bg-slate-800 pb-4">
            {links.map(link => (
              <button
                key={link.id}
                onClick={() => {
                  setPage(link.id);
                  setIsMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 ${currentPage === link.id ? 'bg-slate-700 text-blue-400' : 'text-gray-300'}`}
              >
                {link.text}
              </button>
            ))}
          </div>
        )}
      </nav>
    );
  };

  const HomeSection = () => {
    const latestNews = getLatestNews();

    return (
      <div className="animate-fade-in">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">{labData.info.name}</h1>
            <h2 className="text-xl md:text-2xl text-blue-300 font-light mb-6">{labData.info.englishName}</h2>
            <p className="max-w-3xl mx-auto text-gray-300 leading-relaxed text-lg">
              {labData.info.description}
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Activity Photos */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 mb-4 border-b-2 border-blue-600 pb-2">
              <Users className="text-blue-600" />
              <h3 className="text-2xl font-bold text-slate-800">實驗室活動</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {labData.activity_photos.length > 0 ? (
                labData.activity_photos.map((photo, idx) => (
                  <div key={idx} className="group relative overflow-hidden rounded-lg shadow-md aspect-video cursor-pointer">
                    <img 
                      src={photo.url} 
                      onError={(e) => {e.target.src='/api/placeholder/800/400'; e.target.alt='Image not found'}}
                      alt={photo.caption} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-white text-sm font-medium">{photo.caption}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-10 bg-gray-100 rounded text-gray-500">
                  尚無活動照片，請在 data/activity_photos.csv 新增資料
                </div>
              )}
            </div>

            {/* Professor Intro Snippet */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 mt-8">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                 <img 
                   src={labData.professor.image} 
                   onError={(e) => {e.target.src='/api/placeholder/400/400'}}
                   alt="Professor" 
                   className="w-32 h-32 rounded-full object-cover shadow-lg border-4 border-white bg-gray-200" 
                 />
                 <div className="flex-1">
                   <h3 className="text-xl font-bold mb-2 text-slate-800">主持人：{labData.professor.name}</h3>
                   <p className="text-gray-600 mb-4 line-clamp-3">
                     {labData.info.description ? `歡迎來到${labData.info.name}。` : "歡迎來到我們的實驗室。"}
                     我們專注於最新的熱流技術研究。若對我們的研究有興趣，歡迎隨時聯繫。
                   </p>
                   <button 
                    onClick={() => setPage('professor')}
                    className="text-blue-600 font-medium hover:underline flex items-center gap-1"
                   >
                     查看完整簡介 <ChevronRight size={16} />
                   </button>
                 </div>
              </div>
            </div>
          </div>

          {/* Right Column: Latest News (Auto-fetched) */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-600 sticky top-20">
              <div className="flex items-center gap-2 mb-6">
                <Award className="text-blue-600" />
                <h3 className="text-xl font-bold text-slate-800">最新消息 & 榮譽</h3>
              </div>
              
              <div className="space-y-4">
                {latestNews.length > 0 ? latestNews.map((item, index) => (
                  <div key={index} className="border-l-2 border-gray-200 pl-4 py-1 hover:border-blue-400 transition-colors">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-1 inline-block
                      ${item.category === 'honor' ? 'bg-yellow-100 text-yellow-700' : 
                        item.category === 'patent' ? 'bg-purple-100 text-purple-700' : 
                        item.category === 'project' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {item.type}
                    </span>
                    <p className="text-gray-500 text-xs mb-1">{item.date}</p>
                    <p className="text-slate-700 font-medium text-sm leading-snug hover:text-blue-600 cursor-pointer">
                      {item.title}
                    </p>
                  </div>
                )) : (
                  <div className="text-sm text-gray-500 text-center py-4">目前沒有最新消息</div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                <button onClick={() => setPage('research')} className="text-sm text-gray-500 hover:text-blue-600">查看更多研究成果</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ProfessorSection = () => {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-fade-in">
        {/* Header Profile */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-10">
          <div className="md:flex">
            <div className="md:w-1/3 bg-slate-50 p-8 flex flex-col items-center justify-center text-center border-r border-gray-100">
              <div className="w-48 h-48 rounded-full overflow-hidden mb-6 shadow-xl border-4 border-white bg-gray-300">
                <img 
                  src={labData.professor.image} 
                  onError={(e) => {e.target.src='/api/placeholder/400/400'}}
                  alt={labData.professor.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">{labData.professor.name}</h2>
              <p className="text-blue-600 font-medium mb-4">{labData.professor.title}</p>
              
              <div className="w-full space-y-3 text-left text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-500" />
                  <span>{labData.info.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-blue-500" />
                  <a href={`mailto:${labData.info.email}`} className="hover:text-blue-600">{labData.info.email}</a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-blue-500" />
                  <span>{labData.info.phone}</span>
                </div>
              </div>
            </div>
            
            <div className="md:w-2/3 p-8">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <GraduationCap className="text-blue-600" /> 學歷
              </h3>
              <ul className="space-y-4 mb-8">
                {labData.education.map((edu, idx) => (
                  <li key={idx} className="flex flex-col sm:flex-row sm:justify-between border-b border-gray-100 pb-2">
                    <span className="font-medium text-slate-700">{edu.degree}</span>
                    <div className="flex gap-4 text-gray-500 text-sm">
                      <span>{edu.school}</span>
                      <span>{edu.year}</span>
                    </div>
                  </li>
                ))}
              </ul>

              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Award className="text-blue-600" /> 榮譽與獎項
              </h3>
              <ul className="space-y-3">
                {labData.honors.map((honor, idx) => (
                  <li key={idx} className="flex gap-3 text-gray-700">
                    <span className="text-blue-600 font-bold min-w-[3rem]">{honor.year}</span>
                    <span>{honor.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Experience Section */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-l-4 border-blue-600 pl-3">主要經歷</h3>
            <ul className="space-y-6 relative border-l border-gray-200 ml-3 pl-6">
              {labData.experience_main.map((exp, idx) => (
                <li key={idx} className="relative">
                  <span className="absolute -left-[1.95rem] top-1.5 w-3 h-3 bg-blue-600 rounded-full ring-4 ring-white"></span>
                  <span className="block text-sm text-gray-400 font-mono mb-1">{exp.period}</span>
                  <h4 className="font-bold text-slate-700">{exp.org}</h4>
                  <p className="text-gray-600">{exp.title}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-l-4 border-green-600 pl-3">相關經歷</h3>
            <ul className="space-y-4">
              {labData.experience_related.map((exp, idx) => (
                <li key={idx} className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-bold text-slate-700">{exp.title}</h4>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">{exp.period}</span>
                  </div>
                  <p className="text-gray-600 text-sm">{exp.org}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const ResearchSection = () => {
    const [activeTab, setActiveTab] = useState('projects');
    
    const tabs = [
      { id: 'projects', label: '研究計畫', icon: <FileText size={18} /> },
      { id: 'patents', label: '專利', icon: <Award size={18} /> },
      { id: 'conf_intl', label: '國際研討會', icon: <Globe size={18} /> },
      { id: 'conf_dom', label: '國內研討會', icon: <Users size={18} /> },
    ];

    return (
      <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in">
        {/* ... existing code ... */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-800 mb-3">研究成果</h2>
          <p className="text-gray-500">Research Achievements & Publications</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300
                ${activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg scale-105' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm border border-gray-100'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-h-[400px]">
          <div className="p-6 md:p-8">
            
            {/* Projects Table */}
            {activeTab === 'projects' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                      <th className="p-4 rounded-tl-lg">執行期限</th>
                      <th className="p-4">計畫名稱</th>
                      <th className="p-4">委託單位</th>
                      <th className="p-4 rounded-tr-lg">擔任職務</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {labData.projects.map((item, i) => (
                      <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-4 font-mono text-sm text-blue-600 font-bold whitespace-nowrap">{item.year}</td>
                        <td className="p-4 font-medium text-slate-700">{item.title}</td>
                        <td className="p-4 text-gray-600">{item.agency}</td>
                        <td className="p-4 text-gray-600"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{item.role}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Patents Grid */}
            {activeTab === 'patents' && (
              <div className="grid md:grid-cols-2 gap-6">
                {labData.patents.map((item, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow flex items-start gap-4">
                    <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                      <Award size={24} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{item.region}</span>
                      <h3 className="font-bold text-lg text-slate-800 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-600 font-mono">專利號碼: {item.number}</p>
                      <p className="text-sm text-gray-500 mt-2">獲證日期: {item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Int'l Conf List */}
            {activeTab === 'conf_intl' && (
              <div className="space-y-4">
                 {labData.conference_intl.map((item, i) => (
                   <div key={i} className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg">
                     <div className="md:w-24 flex-shrink-0">
                       <span className="font-bold text-2xl text-blue-200">{item.year}</span>
                     </div>
                     <div className="flex-1">
                       <h4 className="text-lg font-bold text-slate-800 mb-1">{item.title}</h4>
                       <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                         <span className="flex items-center gap-1"><BookOpen size={14}/> {item.conference}</span>
                         <span className="flex items-center gap-1"><MapPin size={14}/> {item.location}</span>
                       </div>
                     </div>
                   </div>
                 ))}
              </div>
            )}

             {/* Dom Conf List */}
             {activeTab === 'conf_dom' && (
              <div className="space-y-4">
                 {labData.conference_dom.map((item, i) => (
                   <div key={i} className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg">
                     <div className="md:w-24 flex-shrink-0">
                       <span className="font-bold text-2xl text-green-200">{item.year}</span>
                     </div>
                     <div className="flex-1">
                       <h4 className="text-lg font-bold text-slate-800 mb-1">{item.title}</h4>
                       <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                         <span className="flex items-center gap-1"><BookOpen size={14}/> {item.conference}</span>
                         <span className="flex items-center gap-1"><MapPin size={14}/> {item.location}</span>
                       </div>
                     </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Footer = () => (
    <footer className="bg-slate-900 text-gray-400 py-8 mt-12">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="font-bold text-white text-lg mb-2">{labData.info.name || "載入中..."}</p>
        <p className="text-sm mb-4">{labData.info.englishName}</p>
        <div className="flex justify-center gap-6 text-sm">
          <p>{labData.info.location}</p>
          <p>Tel: {labData.info.phone}</p>
        </div>
        <p className="text-xs text-gray-600 mt-6">© {new Date().getFullYear()} All Rights Reserved. Powered by GitHub Pages.</p>
      </div>
    </footer>
  );
  
  // 修正：補回被遺漏的 renderPage 函式
  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomeSection />;
      case 'professor': return <ProfessorSection />;
      case 'research': return <ResearchSection />;
      default: return <HomeSection />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      <Navigation />
      <main className="min-h-[calc(100vh-200px)]">
        {renderPage()}
      </main>
      <Footer />
    </div>
  );
}
