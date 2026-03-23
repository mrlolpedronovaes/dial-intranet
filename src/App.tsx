import React, { useState, useEffect, Component, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, FileText, FolderOpen, Users, Briefcase, Calculator,
  Calendar, ArrowUpRight, Bell, Plus, LogOut, LogIn, X, Edit, Trash2,
  Cake, User as UserIcon, Phone, Mail, Globe, Table, LayoutGrid, CheckCircle2, MessageSquare,
  Eye, ChevronLeft, ChevronRight, Maximize2, FilePieChart,
  BarChart3, Sparkles, Loader2, Layout, Type, Hash, DollarSign, PieChart as PieChartIcon,
  ArrowRight, ArrowLeft, Download
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { GoogleGenAI, Type as GenAIType } from "@google/genai";
import { auth, db, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, deleteDoc, where, limit, getDocs, writeBatch, increment } from 'firebase/firestore';

// --- Error Handling Spec ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type SlideType = 'title' | 'intro' | 'metrics' | 'chart' | 'cases' | 'vision' | 'thanks';

interface SlideData {
  type: SlideType;
  title?: string;
  subtitle?: string;
  content?: string;
  metrics?: { value: string; label: string; description?: string }[];
  chartData?: { name: string; value: number }[];
  cases?: { title: string; value: string; description: string; tag?: string }[];
  points?: { title: string; content: string }[];
  image?: string;
}

interface Report {
  id: string;
  title: string;
  date: string;
  category: string;
  slides: SlideData[];
  createdAt: any;
  authorId: string;
  authorName: string;
}

const ReportViewer = ({ isOpen, onClose, report }: { isOpen: boolean; onClose: () => void; report: Report | null }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen || !report) return null;

  const renderSlide = (slide: SlideData) => {
    switch (slide.type) {
      case 'title':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="mb-12">
              <h2 className="text-xl font-bold tracking-widest uppercase mb-2">DIAL</h2>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 text-[#1D1D1F] whitespace-pre-line">
              {slide.title}
            </h1>
            <p className="text-2xl text-[#86868B] mb-24">{slide.subtitle}</p>
            <div className="text-lg text-[#86868B]">
              {slide.content}
            </div>
          </div>
        );
      case 'intro':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 h-full">
            <div className="flex flex-col justify-center p-16 bg-[#1D1D1F] text-white">
              <div className="mb-12">
                <h2 className="text-xl font-bold tracking-widest uppercase">DIAL</h2>
              </div>
              <h1 className="text-7xl font-bold tracking-tight mb-8 whitespace-pre-line">{slide.title}</h1>
              <p className="text-2xl text-gray-400 mb-4">{slide.subtitle}</p>
              <p className="text-sm text-gray-500 mt-auto">{slide.content}</p>
            </div>
            <div className="bg-gray-100 flex items-center justify-center p-12">
              <div className="w-full max-w-md aspect-square bg-white rounded-[3rem] shadow-2xl flex items-center justify-center overflow-hidden">
                 <img src={slide.image || "https://picsum.photos/seed/abstract/800/800"} alt="Abstract" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
        );
      case 'metrics':
        return (
          <div className="p-16 h-full flex flex-col">
            <div className="flex justify-between items-start mb-24">
              <h2 className="text-4xl font-bold tracking-tight">{slide.title}</h2>
              <span className="text-sm text-[#86868B]">{slide.subtitle}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-24">
              {slide.metrics?.map((m, i) => (
                <div key={i}>
                  <div className="text-6xl font-bold text-[#1D1D1F] mb-2">{m.value}</div>
                  <div className="text-sm font-bold uppercase tracking-wider text-[#86868B] mb-4">{m.label}</div>
                  <p className="text-[#86868B]">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'chart':
        return (
          <div className="p-16 h-full flex flex-col">
            <div className="flex justify-between items-start mb-12">
              <h2 className="text-4xl font-bold tracking-tight">{slide.title}</h2>
              <span className="text-sm text-[#86868B]">{slide.subtitle}</span>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slide.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#86868B', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#86868B', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8f8f8' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#1D1D1F" 
                    radius={[8, 8, 0, 0]} 
                    barSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {slide.content && (
              <p className="mt-8 text-center text-xl text-[#86868B] max-w-3xl mx-auto">
                {slide.content}
              </p>
            )}
          </div>
        );
      case 'cases':
        return (
          <div className="p-16 h-full flex flex-col">
            <div className="flex justify-between items-start mb-24">
              <h2 className="text-4xl font-bold tracking-tight">{slide.title}</h2>
              <span className="text-sm text-[#86868B]">{slide.subtitle}</span>
            </div>
            <div className="grid grid-cols-3 gap-8 flex-1">
              {slide.cases?.map((c, i) => (
                <div key={i} className="bg-gray-50 p-12 rounded-[3rem] flex flex-col">
                  <div className="text-4xl font-bold text-[#1D1D1F] mb-4">{c.value}</div>
                  <h3 className="text-xl font-bold mb-6">{c.title}</h3>
                  <p className="text-[#86868B] mb-8">{c.description}</p>
                  {c.tag && <div className="mt-auto text-xs font-bold uppercase tracking-widest text-[#86868B]">{c.tag}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      case 'vision':
        return (
          <div className="p-16 h-full flex flex-col">
            <div className="flex justify-between items-start mb-24">
              <h2 className="text-4xl font-bold tracking-tight">{slide.title}</h2>
              <span className="text-sm text-[#86868B]">{slide.subtitle}</span>
            </div>
            <div className="grid grid-cols-2 gap-16 flex-1">
              {slide.points?.map((p, i) => (
                <div key={i}>
                  <div className="text-sm font-bold uppercase tracking-widest text-[#0071E3] mb-4">{p.title}</div>
                  <p className="text-xl text-[#1D1D1F] leading-relaxed">{p.content}</p>
                </div>
              ))}
            </div>
            {slide.content && (
              <div className="mt-auto p-12 bg-gray-50 rounded-[2rem] text-center italic text-2xl text-[#1D1D1F]">
                "{slide.content}"
              </div>
            )}
          </div>
        );
      case 'thanks':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <h1 className="text-9xl font-bold tracking-tighter mb-12 text-[#1D1D1F]">{slide.title || 'thanks'}</h1>
            <p className="text-2xl text-[#86868B] mb-24">{slide.subtitle}</p>
            <div className="text-xl font-bold tracking-widest uppercase text-[#1D1D1F]">{slide.content}</div>
          </div>
        );
      default:
        return null;
    }
  };

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % report.slides.length);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + report.slides.length) % report.slides.length);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [report, currentSlide]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-white flex flex-col"
    >
      <div className="absolute top-8 right-8 z-[110] flex items-center gap-4 no-print">
        <div className="text-sm font-medium text-[#86868B]">
          {currentSlide + 1} / {report.slides.length}
        </div>
        <button 
          onClick={() => window.print()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
          title="Exportar para PDF"
        >
          <Download className="w-5 h-5 text-[#1D1D1F]" />
          <span className="hidden sm:inline">Exportar PDF</span>
        </button>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-[#1D1D1F]" />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden no-print">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0"
          >
            {renderSlide(report.slides[currentSlide])}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Print-only version with all slides */}
      <div className="hidden print:block">
        {report.slides.map((slide, index) => (
          <div key={index} className="page-break-after-always h-screen w-screen flex flex-col overflow-hidden bg-white relative">
            {renderSlide(slide)}
          </div>
        ))}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 z-[110] no-print">
        <button 
          onClick={prevSlide}
          className="p-4 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30"
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button 
          onClick={nextSlide}
          className="p-4 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30"
          disabled={currentSlide === report.slides.length - 1}
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </motion.div>
  );
};

const ReportCreator = ({ isOpen, onClose, onCreated, userProfile }: { isOpen: boolean; onClose: () => void; onCreated: () => void; userProfile: any }) => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('Geral');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = ['Geral', 'Financeiro', 'Comercial', 'TI', 'RH', 'Operacional'];

  const generateReport = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a professional business report in JSON format based on this prompt: "${prompt}". 
        The report should follow this structure:
        {
          "title": "Report Title",
          "date": "Month Year",
          "slides": [
            {
              "type": "title",
              "title": "Main Title",
              "subtitle": "Subtitle",
              "content": "Footer text"
            },
            {
              "type": "intro",
              "title": "Intro Title",
              "subtitle": "Intro Subtitle",
              "content": "Intro Footer",
              "image": "https://picsum.photos/seed/report/800/800"
            },
            {
              "type": "metrics",
              "title": "Key Metrics",
              "subtitle": "Period",
              "metrics": [
                { "value": "10%", "label": "Growth", "description": "Description" }
              ]
            },
            {
              "type": "chart",
              "title": "Performance Chart",
              "subtitle": "Data overview",
              "chartData": [
                { "name": "Jan", "value": 100 },
                { "name": "Feb", "value": 150 }
              ],
              "content": "Chart analysis"
            },
            {
              "type": "cases",
              "title": "Success Cases",
              "subtitle": "Highlights",
              "cases": [
                { "title": "Case 1", "value": "$1M", "description": "Details", "tag": "Top Case" }
              ]
            },
            {
              "type": "vision",
              "title": "Future Vision",
              "subtitle": "2026 Goals",
              "points": [
                { "title": "Goal 1", "content": "Strategy details" }
              ],
              "content": "Closing quote"
            },
            {
              "type": "thanks",
              "title": "thanks",
              "subtitle": "Final message",
              "content": "Company tagline"
            }
          ]
        }
        Return ONLY the JSON. Max 10 slides. Use Portuguese for the content.`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const reportData = JSON.parse(response.text);
      
      await addDoc(collection(db, 'reports'), {
        ...reportData,
        category,
        createdAt: serverTimestamp(),
        authorId: auth.currentUser?.uid,
        authorName: userProfile?.displayName || auth.currentUser?.displayName || 'Usuário Dial'
      });

      onCreated();
      onClose();
      setPrompt('');
    } catch (error) {
      console.error("Error generating report:", error);
      setError("Erro ao gerar relatório. Verifique sua conexão e tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-[#1D1D1F]">Criar Novo Relatório</h2>
            <p className="text-[#86868B]">Use IA para gerar uma apresentação profissional</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#1D1D1F] uppercase tracking-widest mb-3">
                Categoria
              </label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#1D1D1F] uppercase tracking-widest mb-3">
              O que você quer reportar?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Relatório de vendas do Q1 2024, com foco em crescimento de 15% e novos clientes no setor público..."
              className="w-full h-40 p-6 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-black transition-all resize-none text-lg"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={generateReport}
              disabled={isGenerating || !prompt}
              className="flex-1 bg-[#1D1D1F] hover:bg-black text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Gerar Relatório Keynote
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-8 bg-gray-100 hover:bg-gray-200 text-[#1D1D1F] rounded-2xl font-bold transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ReportEditor = ({ isOpen, onClose, report }: { isOpen: boolean; onClose: () => void; report: Report | null }) => {
  const [editedReport, setEditedReport] = useState<Report | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (report) setEditedReport(JSON.parse(JSON.stringify(report)));
  }, [report]);

  const handleSave = async () => {
    if (!editedReport) return;
    setIsSaving(true);
    try {
      const { id, ...data } = editedReport;
      await updateDoc(doc(db, 'reports', id), data);
      onClose();
    } catch (error) {
      console.error("Error updating report:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !editedReport) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-[#1D1D1F]">Editar Relatório</h2>
            <p className="text-[#86868B]">Ajuste os detalhes e slides do relatório</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-[#1D1D1F] uppercase tracking-widest mb-3">Título</label>
              <input 
                type="text" 
                value={editedReport.title}
                onChange={(e) => setEditedReport({...editedReport, title: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-black outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#1D1D1F] uppercase tracking-widest mb-3">Data</label>
              <input 
                type="text" 
                value={editedReport.date}
                onChange={(e) => setEditedReport({...editedReport, date: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-black outline-none"
              />
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold text-[#1D1D1F]">Slides</h3>
            {editedReport.slides.map((slide, sIdx) => (
              <div key={sIdx} className="p-6 bg-gray-50 rounded-[2rem] space-y-4 border border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold uppercase tracking-widest text-[#86868B]">Slide {sIdx + 1} - {slide.type}</span>
                  <button 
                    onClick={() => {
                      const newSlides = editedReport.slides.filter((_, i) => i !== sIdx);
                      setEditedReport({...editedReport, slides: newSlides});
                    }}
                    className="text-red-500 hover:text-red-700 text-sm font-bold"
                  >
                    Remover
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#86868B] uppercase mb-1">Título do Slide</label>
                    <input 
                      type="text" 
                      value={slide.title || ''}
                      onChange={(e) => {
                        const newSlides = [...editedReport.slides];
                        newSlides[sIdx] = {...newSlides[sIdx], title: e.target.value};
                        setEditedReport({...editedReport, slides: newSlides});
                      }}
                      className="w-full bg-white border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#86868B] uppercase mb-1">Subtítulo</label>
                    <input 
                      type="text" 
                      value={slide.subtitle || ''}
                      onChange={(e) => {
                        const newSlides = [...editedReport.slides];
                        newSlides[sIdx] = {...newSlides[sIdx], subtitle: e.target.value};
                        setEditedReport({...editedReport, slides: newSlides});
                      }}
                      className="w-full bg-white border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#86868B] uppercase mb-1">Conteúdo/Rodapé</label>
                  <textarea 
                    value={slide.content || ''}
                    onChange={(e) => {
                      const newSlides = [...editedReport.slides];
                      newSlides[sIdx] = {...newSlides[sIdx], content: e.target.value};
                      setEditedReport({...editedReport, slides: newSlides});
                    }}
                    className="w-full bg-white border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-black outline-none h-20 resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-[#1D1D1F] hover:bg-black text-white rounded-2xl py-4 font-bold transition-all disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
          <button
            onClick={onClose}
            className="px-8 bg-gray-100 hover:bg-gray-200 text-[#1D1D1F] rounded-2xl font-bold transition-all"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Reports = ({ userProfile }: { userProfile: any }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reports.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const reportId = params.get('reportId');
      if (reportId) {
        const report = reports.find(r => r.id === reportId);
        if (report) {
          setSelectedReport(report);
        }
      }
    }
  }, [reports]);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      setReports(reportsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });

    return () => unsubscribe();
  }, []);

  const deleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este relatório?')) {
      try {
        await deleteDoc(doc(db, 'reports', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `reports/${id}`);
      }
    }
  };

  const openInNewTab = (report: Report) => {
    const url = `${window.location.origin}${window.location.pathname}?reportId=${report.id}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-12">
      <div className={selectedReport ? 'no-print' : ''}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-2 text-[#1D1D1F]">
              Relatórios & Performance
            </h1>
            <p className="text-xl text-[#86868B] font-medium tracking-tight">
              Análises estratégicas e resultados da Dial Network.
            </p>
          </div>
          <button
            onClick={() => setIsCreatorOpen(true)}
            className="bg-[#1D1D1F] hover:bg-black text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Novo Relatório
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
        {/* Static Report (Anual 2025) */}
        <motion.div
          whileHover={{ y: -8 }}
          onClick={() => setSelectedReport({
            id: 'static-2025',
            title: 'Anual Performance Review 2025',
            date: 'Dezembro 2025',
            category: 'Geral',
            authorId: 'system',
            authorName: 'Dial Network',
            createdAt: null,
            slides: [
              {
                type: 'title',
                title: 'Annual Performance\nReview 2025',
                subtitle: 'The next level starts now',
                content: 'Aguardando início — Pedro Novaes, IT Manager'
              },
              {
                type: 'intro',
                title: '2025.\nUm ano de inflexão.',
                subtitle: 'Tecnologia, ritmo e execução.',
                content: 'Período fiscal: 07/12/2024 a 30/11/2025',
                image: 'https://picsum.photos/seed/abstract/800/800'
              },
              {
                type: 'metrics',
                title: 'Destaques Executivos',
                subtitle: 'Período fiscal: 07/12/2024 a 06/12/2025',
                metrics: [
                  { value: '+12,4%', label: 'Crescimento no pipeline', description: 'Demanda acumulada no terceiro trimestre impulsionada por high-end, IA e Apple.' },
                  { value: '+14%', label: 'Aumento no volume de entregas', description: 'Operação escalada mesmo com pressão por prazos e importação instável.' },
                  { value: '-22%', label: 'Eficiência interna', description: 'Redução de tempo em processos jurídicos, cotações e workflow com IA.' },
                  { value: '+1 unit', label: 'Estrutura operacional', description: 'POP detalhado pelo CEO e organograma consolidado para 2026.' },
                  { value: '+30%', label: 'Parcerias estratégicas', description: 'Novo acordo encurtando prazos de importação.' },
                  { value: '+2 níveis', label: 'Maturidade', description: 'Melhoria direta na qualidade técnica e gestão da cadência.' }
                ]
              },
              {
                type: 'chart',
                title: 'Volume de Oportunidades',
                subtitle: 'Licitações 2025',
                chartData: [
                  { name: 'Gerenciadas', value: 2733 },
                  { name: 'Participadas', value: 1003 },
                  { name: 'Ganhas', value: 168 }
                ],
                content: 'Conversão consistente mesmo em um cenário competitivo agressivo.'
              },
              {
                type: 'cases',
                title: 'Cases que definiram o ano',
                subtitle: '2025 Highlights',
                cases: [
                  { title: 'Fundação Cearense', value: 'R$ 500k', description: 'Supercomputador, TR extremamente complexo. 100% de acerto técnico.', tag: 'Case do Ano' },
                  { title: 'SENAC Goiás', value: 'R$ 1,8 mi', description: 'Multi-linha Apple (iMac, iPad, MacBook). Operação limpa.', tag: 'Apple Case 2025' },
                  { title: 'UDESC', value: 'R$ 800k', description: 'MacBooks + iMacs para modernização de laboratórios.', tag: 'Apple Case 2025' }
                ]
              },
              {
                type: 'vision',
                title: 'O que vai redefinir 2026',
                subtitle: 'Estratégia 2026',
                points: [
                  { title: '01. Demanda High-End & IA', content: 'Crescimento sólido em GPU, workstations e supermáquinas.' },
                  { title: '02. Ecossistema Apple', content: 'Apple deixa de ser nicho e vira padrão em educação e saúde.' },
                  { title: '03. TRs Técnicos', content: 'A vantagem competitiva será a interpretação técnica + resposta rápida.' },
                  { title: '04. Logística', content: '2026 exigirá previsibilidade e controle extremo de lead time.' }
                ],
                content: '2026 não será um ano de estabilidade. Será um ano de sofisticação.'
              },
              {
                type: 'thanks',
                title: 'thanks',
                subtitle: 'A DIAL segue pronta para entregar o próximo nível.',
                content: '2026 IS OURS.'
              }
            ]
          })}
          className="group relative bg-white rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-gray-100"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <FilePieChart className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-16 h-16 bg-[#1D1D1F] rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FilePieChart className="w-8 h-8 text-white" />
              </div>
              <span className="px-3 py-1 bg-gray-100 text-[#1D1D1F] text-xs font-bold rounded-full uppercase tracking-widest">Geral</span>
            </div>
            <h3 className="text-2xl font-bold text-[#1D1D1F] mb-2">Anual Performance Review 2025</h3>
            <p className="text-[#86868B] mb-8">Relatório consolidado do período fiscal 2025.</p>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold uppercase tracking-widest text-[#86868B]">Dezembro 2025</span>
                <span className="text-xs text-[#86868B]">por Dial Network</span>
              </div>
              <div className="flex items-center gap-2 text-[#0071E3] font-semibold group-hover:translate-x-2 transition-transform">
                Ver Relatório
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Reports */}
        {reports.map((report) => (
          <motion.div
            key={report.id}
            whileHover={{ y: -8 }}
            onClick={() => setSelectedReport(report)}
            className="group relative bg-white rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-gray-100"
          >
            <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingReport(report);
                }}
                className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openInNewTab(report);
                }}
                className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => deleteReport(report.id, e)}
                className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <BarChart3 className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-widest">{report.category || 'Geral'}</span>
              </div>
              <h3 className="text-2xl font-bold text-[#1D1D1F] mb-2">{report.title}</h3>
              <p className="text-[#86868B] mb-8">Relatório gerado via IA estratégica.</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold uppercase tracking-widest text-[#86868B]">{report.date}</span>
                  <span className="text-xs text-[#86868B]">por {report.authorName}</span>
                </div>
                <div className="flex items-center gap-2 text-[#0071E3] font-semibold group-hover:translate-x-2 transition-transform">
                  Ver Relatório
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {reports.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-400 font-medium">Nenhum relatório personalizado ainda.</p>
            <button 
              onClick={() => setIsCreatorOpen(true)}
              className="mt-4 text-[#0071E3] font-bold hover:underline"
            >
              Crie o primeiro agora
            </button>
          </div>
        )}
      </div>

      </div>
      <AnimatePresence>
        {selectedReport && (
          <ReportViewer 
            isOpen={!!selectedReport} 
            onClose={() => setSelectedReport(null)} 
            report={selectedReport}
          />
        )}
      </AnimatePresence>

      <ReportCreator 
        isOpen={isCreatorOpen} 
        onClose={() => setIsCreatorOpen(false)}
        onCreated={() => {}}
        userProfile={userProfile}
      />

      <ReportEditor 
        isOpen={!!editingReport}
        onClose={() => setEditingReport(null)}
        report={editingReport}
      />
    </div>
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] p-4">
          <div className="bg-white p-8 rounded-3xl shadow-lg max-w-lg w-full text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Ops! Algo deu errado.</h2>
            <p className="text-[#86868B] mb-6">Ocorreu um erro ao acessar os dados. Por favor, tente novamente mais tarde ou contate o suporte.</p>
            <pre className="text-left bg-gray-100 p-4 rounded-xl text-xs overflow-auto text-gray-600 mb-6">
              {this.state.error?.message}
            </pre>
            <button onClick={() => window.location.reload()} className="bg-[#1D1D1F] text-white px-6 py-3 rounded-full font-medium hover:bg-black transition-colors">
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App Component ---
function IntranetApp() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userStatus, setUserStatus] = useState<'pending' | 'approved' | 'denied' | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [notices, setNotices] = useState<any[]>([]);
  const [quickLinks, setQuickLinks] = useState<any[]>([]);
  
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQuickLinkModalOpen, setIsQuickLinkModalOpen] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: '', excerpt: '', category: 'Geral', important: false });
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const [noticeToDelete, setNoticeToDelete] = useState<string | null>(null);
  const [newQuickLink, setNewQuickLink] = useState({ category: '', icon: 'FolderOpen', links: [{ name: '', url: '' }], order: 0 });
  const [editingQuickLink, setEditingQuickLink] = useState<any>(null);
  const [quickLinkToDelete, setQuickLinkToDelete] = useState<string | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedUserLogs, setSelectedUserLogs] = useState<any[]>([]);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [motivationalQuote, setMotivationalQuote] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({ displayName: '', gender: '', birthDate: '', phone: '', jobTitle: '', department: '' });
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editUserData, setEditUserData] = useState({ id: '', displayName: '', jobTitle: '', department: '', phone: '', birthDate: '', gender: '' });
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);
  const [isHelpdeskModalOpen, setIsHelpdeskModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [ticketData, setTicketData] = useState({ subject: '', category: 'TI', priority: 'medium', description: '' });
  const [isTicketSuccessOpen, setIsTicketSuccessOpen] = useState(false);

  const quotes = [
    "A tecnologia move o mundo, mas a sua persistência fecha o negócio.",
    "Vender tecnologia é vender o futuro. Esteja pronto para ele.",
    "O sucesso nas vendas de TI vem de entender o problema, não apenas o produto.",
    "Grandes soluções exigem grandes parcerias. Construa confiança.",
    "Inovação sem execução é apenas alucinação. Vamos executar!",
    "O 'não' é apenas o começo de uma conversa técnica.",
    "Sua solução pode mudar uma empresa. Acredite no valor que você entrega.",
    "No mundo digital, a velocidade é essencial, mas a estratégia é vital.",
    "Transformação digital começa com uma conversa de valor.",
    "Cada desafio técnico é uma oportunidade de venda disfarçada."
  ];

  useEffect(() => {
    setMotivationalQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentTab, setCurrentTab] = useState<'home' | 'wiki' | 'reports'>('home');
  const [wikiTab, setWikiTab] = useState<'cotacoes' | 'limpeza' | 'rh' | 'outros'>('cotacoes');
  const [guides, setGuides] = useState<any[]>([]);
  const [cleaningConfig, setCleaningConfig] = useState<any>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isEditGuideModalOpen, setIsEditGuideModalOpen] = useState(false);
  const [newGuide, setNewGuide] = useState({ title: '', content: '', category: 'Cotações' });
  const [editingGuide, setEditingGuide] = useState<any>(null);
  const [guideToDelete, setGuideToDelete] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<any>(null);
  const [dollarRate, setDollarRate] = useState<string | null>(null);

  useEffect(() => {
    const fetchDollarRate = async () => {
      try {
        const response = await fetch('/api/dollar-rate');
        if (!response.ok) throw new Error('Failed to fetch from proxy');
        const data = await response.json();
        if (data?.USDBRL?.bid) {
          setDollarRate(parseFloat(data.USDBRL.bid).toFixed(2));
        } else {
          throw new Error('Invalid data format');
        }
      } catch (error) {
        console.error('Error fetching dollar rate:', error);
        // Set a default value if fetch fails and no rate is set
        if (!dollarRate) setDollarRate('5.42');
      }
    };
    fetchDollarRate();
    const interval = setInterval(fetchDollarRate, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [dollarRate]);

  const CLEANING_TASKS = [
    "BANHEIRO",
    "SACOS DE LIXO",
    "COZINHA",
    "LOG (MOP)",
    "LOG (VASSOURA)",
    "LICITA/REUNIÃO (MOP)",
    "LICITA/REUNIÃO (VASSOURA)",
    "ESCADAS",
    "VIDROS/MESAS",
    "COZINHA/CORREDOR MOP + 1"
  ];

  const INITIAL_PARTICIPANTS = [
    "MATHEUS M",
    "GUILHERME G",
    "PEDRO N",
    "G BESSELLI",
    "CRISTIANE M",
    "KEZIA P",
    "EDUARDO C",
    "CARLOS R",
    "ALESSANDRO P",
    "CAMILA ROSSI"
  ];

  useEffect(() => {
    if (!user || userStatus !== 'approved') return;
    const unsub = onSnapshot(doc(db, 'config', 'cleaning'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Ensure data has all required fields for the new schema
        const needsUpdate = !data.tasks || 
                           !data.participants || 
                           data.participants.length === 0 || 
                           typeof data.manualOverride !== 'object';

        if (isAdmin && needsUpdate) {
          updateDoc(doc(db, 'config', 'cleaning'), {
            tasks: data.tasks || CLEANING_TASKS,
            participants: (data.participants && data.participants.length > 0) ? data.participants : INITIAL_PARTICIPANTS,
            manualOverride: typeof data.manualOverride === 'object' ? data.manualOverride : {},
            updatedAt: serverTimestamp()
          });
        }

        setCleaningConfig({
          ...data,
          tasks: data.tasks || CLEANING_TASKS,
          participants: (data.participants && data.participants.length > 0) ? data.participants : INITIAL_PARTICIPANTS,
          manualOverride: typeof data.manualOverride === 'object' ? data.manualOverride : {},
          currentIndex: data.currentIndex ?? 0
        });
        
        // Auto-rotation logic (only if admin)
        if (isAdmin) {
          const now = new Date();
          const isFriday = now.getDay() === 5;
          const lastDate = data.lastRotationDate?.toDate();
          const isDifferentDay = !lastDate || lastDate.toDateString() !== now.toDateString();
          
          if (isFriday && isDifferentDay && (data.participants?.length > 0 || INITIAL_PARTICIPANTS.length > 0)) {
            const participants = data.participants?.length > 0 ? data.participants : INITIAL_PARTICIPANTS;
            const nextIndex = (data.currentIndex + 1) % participants.length;
            updateDoc(doc(db, 'config', 'cleaning'), {
              currentIndex: nextIndex,
              lastRotationDate: serverTimestamp(),
              manualOverride: {}, // Clear overrides on auto-rotation
              updatedAt: serverTimestamp()
            });
          }
        }
      } else if (isAdmin) {
        // Initialize default config if not exists
        setDoc(doc(db, 'config', 'cleaning'), {
          participants: INITIAL_PARTICIPANTS,
          tasks: CLEANING_TASKS,
          currentIndex: 0,
          lastRotationDate: serverTimestamp(),
          manualOverride: {},
          updatedAt: serverTimestamp()
        });
      }
    }, (error) => console.error('Error fetching cleaning config:', error));
    return () => unsub();
  }, [user, userStatus, isAdmin]);

  const logAction = async (userId: string, action: string, details?: any) => {
    try {
      await addDoc(collection(db, 'userLogs'), {
        userId,
        action,
        details: details || null,
        timestamp: serverTimestamp(),
        performedBy: user?.uid,
      });
      await updateDoc(doc(db, 'users', userId), {
        lastAction: action,
        lastActionAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  const fetchUserLogs = async (userId: string) => {
    try {
      const q = query(
        collection(db, 'userLogs'), 
        where('userId', '==', userId), 
        orderBy('timestamp', 'desc'), 
        limit(50)
      );
      const snapshot = await getDocs(q);
      setSelectedUserLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching user logs:', error);
    }
  };

  const getGreeting = () => {
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      hour12: false
    });
    const hour = parseInt(formatter.format(new Date()));
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Auth & Admin Check
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsAdmin(false);
        setUserStatus(null);
        setLoading(false);
      } else {
        // Check for reportId in URL
        const params = new URLSearchParams(window.location.search);
        const reportId = params.get('reportId');
        if (reportId) {
          setCurrentTab('reports');
        }
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    
    // Initial setup if needed
    const setupUser = async () => {
      try {
        const userDoc = await getDoc(userDocRef);
        const loginData = { 
          email: user.email, 
          lastLogin: serverTimestamp(),
          online: true
        };

        if (!userDoc.exists()) {
          const isMaster = user.email === 'mrlolpedro@gmail.com' && user.emailVerified;
          await setDoc(userDocRef, { 
            ...loginData, 
            role: isMaster ? 'admin' : 'user', 
            status: isMaster ? 'approved' : 'pending',
            displayName: user.displayName || '',
            photoURL: user.photoURL || ''
          });
        } else {
          await updateDoc(userDocRef, loginData);
        }

        // Log the login
        await logAction(user.uid, 'Login realizado');
      } catch (error) {
        console.error("Error setting up user:", error);
      }
    };

    setupUser();

    // Session tracking
    const startTime = Date.now();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logAction(user.uid, 'Saiu da aba (Inativo)');
      } else {
        logAction(user.uid, 'Retornou à aba (Ativo)');
      }
    };

    const handleBeforeUnload = () => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      logAction(user.uid, `Sessão encerrada (Duração: ${duration}s)`, { durationSeconds: duration });
      updateDoc(userDocRef, { 
        online: false,
        totalActivitySeconds: increment(duration)
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    const unsubUserDoc = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setCurrentUserData(data);
        setUserStatus(data.status || 'pending');
        setIsAdmin(data.role === 'admin');
      }
      setLoading(false);
    }, (error) => {
      console.error("Error listening to user doc:", error);
      setLoading(false);
    });

    return () => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      logAction(user.uid, `Logout ou fechamento (Duração: ${duration}s)`, { durationSeconds: duration });
      updateDoc(userDocRef, { 
        online: false,
        totalActivitySeconds: increment(duration)
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubUserDoc();
    };
  }, [user]);

  // Fetch Data
  useEffect(() => {
    if (!user || userStatus !== 'approved') return;
    
    const qNotices = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsubNotices = onSnapshot(qNotices, (snapshot) => {
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'notices'));

    const qLinks = query(collection(db, 'quickLinks'), orderBy('order', 'asc'));
    const unsubLinks = onSnapshot(qLinks, (snapshot) => {
      setQuickLinks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'quickLinks'));

    const qGuides = query(collection(db, 'guides'), orderBy('createdAt', 'desc'));
    const unsubGuides = onSnapshot(qGuides, (snapshot) => {
      setGuides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'guides'));

    const qUsers = query(collection(db, 'users'), where('status', '==', 'approved'));
    const unsubBirthdays = onSnapshot(qUsers, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      
      const monthBirthdays = allUsers.filter(u => {
        if (!u.birthDate) return false;
        const [year, month, day] = u.birthDate.split('-');
        return parseInt(month) === currentMonth;
      }).sort((a, b) => {
        const dayA = parseInt(a.birthDate.split('-')[2]);
        const dayB = parseInt(b.birthDate.split('-')[2]);
        return dayA - dayB;
      });
      
      setBirthdays(monthBirthdays);
      setOnlineUsers(allUsers.filter(u => u.online));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    let unsubUsers = () => {};
    if (isAdmin && isUserManagementOpen) {
      const qUsers = query(collection(db, 'users'));
      unsubUsers = onSnapshot(qUsers, (snapshot) => {
        setUsersList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));
    }

    const qNotifications = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'notifications'));

    return () => {
      unsubNotices();
      unsubLinks();
      unsubGuides();
      unsubBirthdays();
      unsubUsers();
      unsubNotifications();
    };
  }, [user, isAdmin, isUserManagementOpen, userStatus]);

  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength <= 2) return phoneNumber;
    if (phoneNumberLength <= 7) {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
    }
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), profileData);
      await logAction(user.uid, 'Perfil atualizado');
      setIsProfileModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleOpenTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!ticketData.subject.trim() || !ticketData.description.trim()) {
      alert('Por favor, preencha o assunto e a descrição.');
      return;
    }

    try {
      await addDoc(collection(db, 'tickets'), {
        ...ticketData,
        status: 'open',
        createdAt: serverTimestamp(),
        authorId: user.uid,
        authorEmail: user.email || ''
      });
      setIsHelpdeskModalOpen(false);
      setTicketData({ subject: '', category: 'TI', priority: 'medium', description: '' });
      setIsTicketSuccessOpen(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tickets');
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `notifications/${id}`);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const openProfileModal = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfileData({
          displayName: data.displayName || '',
          gender: data.gender || '',
          birthDate: data.birthDate || '',
          phone: data.phone || '',
          jobTitle: data.jobTitle || '',
          department: data.department || ''
        });
      }
      setIsProfileModalOpen(true);
    } catch (error) {
      console.error('Error opening profile modal:', error);
    }
  };

  const handleAdminUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    try {
      const { id, ...data } = editUserData;
      await updateDoc(doc(db, 'users', id), data);
      await logAction(user.uid, `Perfil do usuário ${data.displayName || id} atualizado por admin`);
      setIsEditUserModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editUserData.id}`);
    }
  };

  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    try {
      await addDoc(collection(db, 'notices'), {
        title: newNotice.title,
        date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
        excerpt: newNotice.excerpt,
        category: newNotice.category,
        important: newNotice.important,
        createdAt: serverTimestamp(),
        authorId: user.uid,
        authorName: user.displayName || user.email,
      });
      setIsNoticeModalOpen(false);
      setNewNotice({ title: '', excerpt: '', category: 'Geral', important: false });
    } catch (error) {
      console.error('Error in handleAddNotice:', error);
      alert('Erro ao publicar aviso.');
      handleFirestoreError(error, OperationType.CREATE, 'notices');
    }
  };

  const handleUpdateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin || !editingNotice) return;
    try {
      await updateDoc(doc(db, 'notices', editingNotice.id), {
        title: editingNotice.title,
        excerpt: editingNotice.excerpt,
        category: editingNotice.category,
        important: editingNotice.important,
      });
      setIsEditModalOpen(false);
      setEditingNotice(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notices/${editingNotice.id}`);
    }
  };

  const handleDeleteNotice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !isAdmin) return;
    setNoticeToDelete(id);
  };

  const confirmDeleteNotice = async () => {
    if (!user || !isAdmin || !noticeToDelete) return;
    try {
      await deleteDoc(doc(db, 'notices', noticeToDelete));
      setNoticeToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notices/${noticeToDelete}`);
    }
  };

  const handleSaveQuickLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    
    try {
      if (editingQuickLink) {
        await updateDoc(doc(db, 'quickLinks', editingQuickLink.id), {
          category: editingQuickLink.category,
          icon: editingQuickLink.icon,
          links: editingQuickLink.links,
          order: editingQuickLink.order,
        });
        setEditingQuickLink(null);
      } else {
        await addDoc(collection(db, 'quickLinks'), {
          category: newQuickLink.category,
          icon: newQuickLink.icon,
          links: newQuickLink.links,
          order: newQuickLink.order,
        });
        setNewQuickLink({ category: '', icon: 'FolderOpen', links: [{ name: '', url: '' }], order: 0 });
      }
      setIsQuickLinkModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingQuickLink ? OperationType.UPDATE : OperationType.CREATE, 'quickLinks');
    }
  };

  const confirmDeleteQuickLink = async () => {
    if (!user || !isAdmin || !quickLinkToDelete) return;
    try {
      await deleteDoc(doc(db, 'quickLinks', quickLinkToDelete));
      setQuickLinkToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quickLinks/${quickLinkToDelete}`);
    }
  };

  const handleInviteUser = async () => {
    const emailInput = document.getElementById('inviteEmail') as HTMLInputElement;
    const email = emailInput.value;
    if (!email || !user || !isAdmin) return;
    try {
      await addDoc(collection(db, 'invitations'), {
        email,
        createdAt: serverTimestamp()
      });
      emailInput.value = '';
      alert('Convite enviado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invitations');
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    if (!user || !isAdmin) return;
    try {
      const targetUser = usersList.find(u => u.id === userId);
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
      const statusLabel = newStatus === 'approved' ? 'Aprovado' : (newStatus === 'denied' ? 'Negado' : 'Pendente');
      await logAction(user.uid, `Status de ${targetUser?.email || userId} alterado para: ${statusLabel}`, { targetUserId: userId });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    if (!user || !isAdmin) return;
    try {
      const targetUser = usersList.find(u => u.id === userId);
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      await logAction(user.uid, `Cargo de ${targetUser?.email || userId} alterado para: ${newRole}`, { targetUserId: userId });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!user || !isAdmin) return;
    if (userId === user.uid) {
      alert('Você não pode excluir sua própria conta.');
      return;
    }
    setUserToDelete(userId);
  };

  const confirmDeleteUser = async () => {
    if (!user || !isAdmin || !userToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'users', userToDelete));
      // Also delete logs for this user
      const q = query(collection(db, 'userLogs'), where('userId', '==', userToDelete));
      const logsSnapshot = await getDocs(q);
      const batch = writeBatch(db);
      logsSnapshot.docs.forEach(logDoc => batch.delete(logDoc.ref));
      await batch.commit();
      
      setUserToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userToDelete}`);
    }
  };

  const handleSaveGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    
    try {
      if (editingGuide) {
        await updateDoc(doc(db, 'guides', editingGuide.id), {
          title: editingGuide.title,
          content: editingGuide.content,
          category: editingGuide.category,
        });
        setEditingGuide(null);
        setIsEditGuideModalOpen(false);
      } else {
        await addDoc(collection(db, 'guides'), {
          title: newGuide.title,
          content: newGuide.content,
          category: newGuide.category,
          createdAt: serverTimestamp(),
          authorId: user.uid,
          authorName: user.displayName || user.email,
        });
        setNewGuide({ title: '', content: '', category: 'Cotações' });
        setIsGuideModalOpen(false);
      }
    } catch (error) {
      handleFirestoreError(error, editingGuide ? OperationType.UPDATE : OperationType.CREATE, 'guides');
    }
  };

  const confirmDeleteGuide = async () => {
    if (!user || !isAdmin || !guideToDelete) return;
    try {
      await deleteDoc(doc(db, 'guides', guideToDelete));
      setGuideToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `guides/${guideToDelete}`);
    }
  };

  const filteredNotices = notices.filter(notice => 
    notice.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    notice.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notice.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGuides = guides.filter(guide => 
    (guide.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     guide.content.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (wikiTab === 'cotacoes' ? guide.category === 'Cotações' : 
     wikiTab === 'rh' ? guide.category === 'RH' : 
     wikiTab === 'outros' ? !['Cotações', 'RH'].includes(guide.category) : true)
  );

  const QuotationCalculator = () => {
    const [usdPrice, setUsdPrice] = useState<string>('');
    const [weightKg, setWeightKg] = useState<string>('');
    const [customDollar, setCustomDollar] = useState<string>(dollarRate || '5.42');

    useEffect(() => {
      if (dollarRate && !usdPrice) setCustomDollar(dollarRate);
    }, [dollarRate]);

    const priceNum = parseFloat(usdPrice) || 0;
    const weightNum = parseFloat(weightKg) || 0;
    const dollarNum = parseFloat(customDollar) || 5.42;

    const brlBase = priceNum * dollarNum;
    const shipping = weightNum * 25;
    const saleTax = brlBase * 0.07;
    const total = brlBase + shipping + saleTax;

    return (
      <div className="bg-[#F5F5F7] rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Calculadora de Cotação</h3>
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-gray-100">
            Dólar Atual: R$ {dollarRate || '5.42'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Valor em Dólar ($)</label>
            <input 
              type="number" 
              value={usdPrice} 
              onChange={(e) => setUsdPrice(e.target.value)}
              className="w-full bg-white border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              placeholder="Ex: 1999.00"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Peso (KG)</label>
            <input 
              type="number" 
              value={weightKg} 
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full bg-white border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              placeholder="Ex: 6"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cotação Dólar (R$)</label>
            <input 
              type="number" 
              value={customDollar} 
              onChange={(e) => setCustomDollar(e.target.value)}
              className="w-full bg-white border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              placeholder="Ex: 5.42"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Conversão Base ({usdPrice || '0'} * {customDollar})</span>
              <span className="font-semibold">{brlBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Frete EUA (R$ 25,00 * {weightKg || '0'}kg)</span>
              <span className="font-semibold text-orange-600">+ {shipping.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Sale TAX (7% sobre base)</span>
              <span className="font-semibold text-orange-600">+ {saleTax.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-lg font-bold">Total Estimado</span>
              <span className="text-2xl font-black text-blue-600">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </div>

          <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100/50">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Como funciona a cotação?</h4>
            <ul className="space-y-2 text-[11px] text-blue-800/70 leading-relaxed">
              <li className="flex gap-2">
                <span className="font-bold text-blue-600">1.</span>
                <span>Buscamos o produto desejado (Ex: Apple Mac Studio).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-600">2.</span>
                <span>Convertemos o valor anunciado em dólar para a cotação atual (R$ {customDollar}).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-600">3.</span>
                <span><strong>Frete EUA:</strong> Calculado pelo peso total (R$ 25,00 x KG).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-600">4.</span>
                <span><strong>Sale TAX:</strong> Taxa de 7% sobre o valor convertido em real.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const CleaningRotation = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [showFuture, setShowFuture] = useState(false);
    const [participants, setParticipants] = useState<string[]>([]);
    const [tasks, setTasks] = useState<string[]>([]);
    const [newParticipant, setNewParticipant] = useState('');
    const [newTask, setNewTask] = useState('');

    useEffect(() => {
      if (cleaningConfig) {
        setParticipants(cleaningConfig.participants || []);
        setTasks(cleaningConfig.tasks || []);
      }
    }, [cleaningConfig]);

    if (!cleaningConfig) return null;

    const getAssignments = (indexOffset: number) => {
      const p = cleaningConfig.participants;
      const t = cleaningConfig.tasks;
      if (!p || !t || p.length === 0 || t.length === 0) return [];

      const baseIndex = (cleaningConfig.currentIndex + indexOffset) % p.length;
      return t.map((task, i) => {
        const participantIndex = (baseIndex + i) % p.length;
        const manual = indexOffset === 0 ? cleaningConfig.manualOverride?.[task] : null;
        return {
          task,
          person: manual || p[participantIndex]
        };
      });
    };

    const currentAssignments = getAssignments(0);

    const handleSave = async () => {
      await updateDoc(doc(db, 'config', 'cleaning'), {
        participants,
        tasks,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
    };

    const handleManualOverride = async (task: string, name: string) => {
      const newOverrides = { ...(cleaningConfig.manualOverride || {}) };
      if (newOverrides[task] === name) {
        delete newOverrides[task];
      } else {
        newOverrides[task] = name;
      }
      await updateDoc(doc(db, 'config', 'cleaning'), {
        manualOverride: newOverrides,
        updatedAt: serverTimestamp()
      });
    };

    const getNextFridays = (count: number) => {
      const fridays = [];
      let current = new Date();
      // Find next Friday
      while (current.getDay() !== 5) {
        current.setDate(current.getDate() + 1);
      }
      for (let i = 0; i < count; i++) {
        const d = new Date(current);
        d.setDate(d.getDate() + i * 7);
        fridays.push(d);
      }
      return fridays;
    };

    return (
      <div className="bg-white rounded-3xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100/50">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Rodízio de Limpeza</h3>
              <p className="text-sm text-gray-500">Escala de Sexta-feira</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFuture(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Ver Próximos
            </button>
            {isAdmin && (
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Edit className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {currentAssignments.map((item, idx) => (
            <div 
              key={idx} 
              className={`p-6 rounded-[2rem] border transition-all duration-300 ${
                cleaningConfig.manualOverride?.[item.task] 
                  ? 'bg-amber-50 border-amber-100 shadow-sm' 
                  : 'bg-emerald-50/50 border-emerald-100/50 hover:bg-emerald-50'
              }`}
            >
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">{item.task}</span>
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-emerald-900">{item.person}</h4>
                  {isAdmin && (
                    <select 
                      onChange={(e) => handleManualOverride(item.task, e.target.value)}
                      className="opacity-0 hover:opacity-100 focus:opacity-100 text-[10px] bg-white border border-emerald-200 rounded-lg px-2 py-1 outline-none cursor-pointer transition-opacity"
                      value={item.person}
                    >
                      {participants.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  )}
                </div>
                {cleaningConfig.manualOverride?.[item.task] && (
                  <span className="text-[9px] text-amber-600 font-bold mt-1">Alteração Manual</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {isEditing && (
          <div className="space-y-6 p-6 bg-gray-50 rounded-[2.5rem] border border-gray-100">
            <div>
              <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" /> Participantes
              </h4>
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newParticipant} 
                  onChange={(e) => setNewParticipant(e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  placeholder="Novo participante"
                />
                <button 
                  onClick={() => {
                    if (newParticipant.trim()) {
                      setParticipants([...participants, newParticipant.trim()]);
                      setNewParticipant('');
                    }
                  }}
                  className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {participants.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full group">
                    <span className="text-xs font-medium">{p}</span>
                    <button 
                      onClick={() => setParticipants(participants.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" /> Tarefas
              </h4>
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newTask} 
                  onChange={(e) => setNewTask(e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  placeholder="Nova tarefa"
                />
                <button 
                  onClick={() => {
                    if (newTask.trim()) {
                      setTasks([...tasks, newTask.trim()]);
                      setNewTask('');
                    }
                  }}
                  className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tasks.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full group">
                    <span className="text-xs font-medium">{t}</span>
                    <button 
                      onClick={() => setTasks(tasks.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl text-sm font-bold"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200"
              >
                Salvar Configuração
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showFuture && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[3rem] w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
              >
                <div className="p-8 border-bottom border-gray-100 flex items-center justify-between bg-emerald-900 text-white">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Próximas Semanas</h3>
                    <p className="text-emerald-200 text-sm">Escala de rodízio projetada</p>
                  </div>
                  <button 
                    onClick={() => setShowFuture(false)}
                    className="p-3 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-auto p-8">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-gray-50 p-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">Data</th>
                          {tasks.map(t => (
                            <th key={t} className="p-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 min-w-[150px]">{t}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {getNextFridays(10).map((date, weekIdx) => {
                          const assignments = getAssignments(weekIdx);
                          return (
                            <tr key={weekIdx} className="hover:bg-gray-50 transition-colors">
                              <td className="sticky left-0 z-10 bg-white p-4 text-sm font-bold text-emerald-900 border-b border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                {date.toLocaleDateString('pt-BR')}
                              </td>
                              {assignments.map((a, i) => (
                                <td key={i} className="p-4 text-sm text-gray-600 border-b border-gray-100">
                                  {a.person}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4 font-sans text-[#1D1D1F]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.04)] max-w-md w-full text-center"
        >
          <div className="bg-black text-white px-3 py-1.5 rounded-md inline-flex items-center justify-center mb-8">
            <span className="font-black text-3xl leading-none tracking-tighter">DIAL</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">Bem-vindo à Intranet</h1>
          <p className="text-[#86868B] mb-8 text-lg">Faça login com sua conta corporativa para acessar o portal.</p>
          <button 
            onClick={loginWithGoogle}
            className="w-full bg-[#1D1D1F] hover:bg-black text-white rounded-2xl p-4 font-medium flex items-center justify-center gap-3 transition-colors text-lg"
          >
            <LogIn className="w-5 h-5" />
            Entrar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  if (userStatus === 'pending') {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4 font-sans text-[#1D1D1F]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.04)] max-w-md w-full text-center"
        >
          <div className="bg-black text-white px-3 py-1.5 rounded-md inline-flex items-center justify-center mb-8">
            <span className="font-black text-3xl leading-none tracking-tighter">DIAL</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">Aguardando Aprovação</h1>
          <p className="text-[#86868B] mb-8 text-lg">Sua solicitação de acesso está sendo analisada pelo administrador.</p>
          <button 
            onClick={logout}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl p-4 font-medium flex items-center justify-center gap-3 transition-colors text-lg"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </motion.div>
      </div>
    );
  }

  if (userStatus === 'denied') {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4 font-sans text-[#1D1D1F]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.04)] max-w-md w-full text-center"
        >
          <div className="bg-black text-white px-3 py-1.5 rounded-md inline-flex items-center justify-center mb-8">
            <span className="font-black text-3xl leading-none tracking-tighter">DIAL</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">Acesso Negado</h1>
          <p className="text-[#86868B] mb-8 text-lg">Sua solicitação de acesso foi negada.</p>
          <button 
            onClick={logout}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl p-4 font-medium flex items-center justify-center gap-3 transition-colors text-lg"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans text-[#1D1D1F] selection:bg-[#0071E3] selection:text-white">
      {/* Dollar Rate Bar */}
      {dollarRate && (
        <div className="bg-[#1D1D1F] text-white text-xs py-1.5 px-4 text-center tracking-wide no-print">
          Última cotação do Dólar: <span className="font-semibold">R$ {dollarRate}</span>
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-gray-200/50 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-black text-white px-2.5 py-1 rounded-sm flex items-center justify-center">
              <span className="font-black text-2xl leading-none tracking-tighter">DIAL</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center bg-black/5 rounded-full px-4 py-2 w-96 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0071E3]/20 transition-all">
            <Search className="w-4 h-4 text-[#86868B]" />
            <input 
              type="text" 
              placeholder="Buscar na intranet..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none ml-2 w-full text-sm placeholder:text-[#86868B]"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 text-[#86868B] hover:text-[#1D1D1F] transition-colors"
            >
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-[55]" onClick={() => setIsNotificationsOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-16 right-0 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[60]"
                  >
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                      <h3 className="font-bold text-sm text-gray-900">Notificações</h3>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        {notifications.filter(n => !n.read).length} novas
                      </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors relative group ${!n.read ? 'bg-blue-50/30' : ''}`}
                            onClick={() => markNotificationAsRead(n.id)}
                          >
                            <div className="flex gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                n.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                n.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                                n.type === 'error' ? 'bg-red-100 text-red-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                <Bell className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 mb-0.5">{n.title}</p>
                                <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{n.message}</p>
                                <p className="text-[9px] text-gray-400 mt-1">
                                  {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleString('pt-BR') : 'Agora'}
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                              className="absolute top-4 right-4 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-400">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-10" />
                          <p className="text-xs font-medium">Nenhuma notificação</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            {isAdmin && (
              <button 
                onClick={() => setIsUserManagementOpen(true)}
                className="p-2 text-[#86868B] hover:text-[#1D1D1F] transition-colors"
                title="Gerenciar Usuários"
              >
                <Users className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200/50">
              <button 
                onClick={openProfileModal}
                className="w-8 h-8 bg-gradient-to-tr from-[#0071E3] to-[#42A5F5] text-white rounded-full flex items-center justify-center font-medium text-sm shadow-sm hover:scale-110 transition-transform overflow-hidden"
                title="Meu Perfil"
              >
                {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </button>
              <button onClick={logout} className="p-2 text-[#86868B] hover:text-red-500 transition-colors" title="Sair">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-gray-200/50">
          <div className="flex items-center gap-8 h-12">
            <button 
              onClick={() => setCurrentTab('home')}
              className={`h-full flex items-center text-sm font-medium border-b-2 transition-colors ${currentTab === 'home' ? 'border-[#0071E3] text-[#1D1D1F]' : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'}`}
            >
              Início
            </button>
            <button 
              onClick={() => setCurrentTab('wiki')}
              className={`h-full flex items-center text-sm font-medium border-b-2 transition-colors ${currentTab === 'wiki' ? 'border-[#0071E3] text-[#1D1D1F]' : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'}`}
            >
              Wiki & Guias
            </button>
            <button 
              onClick={() => setCurrentTab('reports')}
              className={`h-full flex items-center text-sm font-medium border-b-2 transition-colors ${currentTab === 'reports' ? 'border-[#0071E3] text-[#1D1D1F]' : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'}`}
            >
              Reports
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
        {currentTab === 'home' && (
          <>
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              className="mb-12"
            >
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-4 text-[#1D1D1F]">
            {getGreeting()}, {user.displayName?.split(' ')[0] || 'Equipe'}.
          </h1>
          <p className="text-xl md:text-2xl text-[#86868B] font-medium max-w-2xl tracking-tight">
            Acompanhe os avisos e acesse as ferramentas da Dialnetwork.
          </p>
          <p className="text-lg md:text-xl text-[#86868B]/70 italic mt-2 font-medium max-w-2xl tracking-tight">
            "{motivationalQuote}"
          </p>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Notices */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="lg:col-span-8 space-y-6"
          >
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-semibold tracking-tight">Mural de Avisos</h2>
              {isAdmin && (
                <button 
                  onClick={() => setIsNoticeModalOpen(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#0071E3] hover:text-blue-700 transition-colors bg-blue-50 px-3 py-1.5 rounded-full"
                >
                  <Plus className="w-4 h-4" /> Novo Aviso
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {filteredNotices.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-gray-100/50 text-[#86868B]">
                  {searchQuery ? 'Nenhum aviso encontrado para a sua busca.' : 'Nenhum aviso publicado ainda.'}
                </div>
              ) : (
                filteredNotices.map((notice) => (
                  <motion.div 
                    key={notice.id}
                    onClick={() => {
                      setSelectedNotice(notice);
                      if (user) logAction(user.uid, `Visualizou aviso: ${notice.title}`, { noticeId: notice.id });
                    }}
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100/50 cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-medium px-3 py-1 bg-[#F5F5F7] text-[#1D1D1F] rounded-full">
                        {notice.category}
                      </span>
                      <span className="text-sm text-[#86868B] flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" /> {notice.date}
                      </span>
                      {notice.authorName && (
                        <span className="text-xs text-[#86868B] bg-gray-100 px-2 py-0.5 rounded-md">
                          por {notice.authorName}
                        </span>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        {notice.important && (
                          <span className="text-xs font-medium px-3 py-1 bg-red-50 text-red-600 rounded-full">
                            Importante
                          </span>
                        )}
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNotice(notice);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors bg-white rounded-full shadow-sm border border-gray-100"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteNotice(notice.id, e)}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors bg-white rounded-full shadow-sm border border-gray-100"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="text-2xl font-semibold tracking-tight mb-3 group-hover:text-[#0071E3] transition-colors">
                      {notice.title}
                    </h3>
                    <p className="text-[#86868B] leading-relaxed text-lg">
                      {notice.excerpt}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Side Column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="lg:col-span-4 space-y-8"
          >
            {/* Workspace Section */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100/50">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <h3 className="font-semibold tracking-tight text-lg">Workspace</h3>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-red-50 transition-colors group" title="Gmail">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Gmail</span>
                </a>
                <a href="https://chat.google.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-emerald-50 transition-colors group" title="Chat">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Chat</span>
                </a>
                <a href="https://docs.google.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-blue-50 transition-colors group" title="Docs">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Docs</span>
                </a>
                <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-emerald-50 transition-colors group" title="Planilhas">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <Table className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Sheets</span>
                </a>
                <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-orange-50 transition-colors group" title="Agenda">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Agenda</span>
                </a>
                <a href="https://www.dialnetwork.com.br" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-indigo-50 transition-colors group" title="Site Empresa">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Site</span>
                </a>
                <a href="https://dial.rspcloud.com.br/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-purple-50 transition-colors group" title="CRM">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">CRM</span>
                </a>
              </div>
            </div>

            {/* Birthdays Section */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100/50">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-500">
                  <Cake className="w-5 h-5" />
                </div>
                <h3 className="font-semibold tracking-tight text-lg">Aniversariantes do Mês</h3>
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {birthdays.length > 0 ? (
                  birthdays.map((u) => {
                    const [year, month, day] = u.birthDate.split('-');
                    const isToday = new Date().getDate() === parseInt(day);
                    return (
                      <div 
                        key={u.id} 
                        onClick={() => setSelectedUserDetail(u)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${isToday ? 'bg-pink-50 border-pink-100 shadow-sm hover:bg-pink-100' : 'bg-gray-50/50 border-transparent hover:border-gray-100 hover:bg-gray-100'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${isToday ? 'bg-pink-500 animate-pulse' : 'bg-gray-300'}`}>
                            {u.displayName?.[0] || u.email?.[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{u.displayName || u.email.split('@')[0]}</p>
                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{day} de {new Date(0, parseInt(month)-1).toLocaleString('pt-BR', { month: 'long' })}</p>
                          </div>
                        </div>
                        {isToday && (
                          <span className="text-[9px] font-black text-pink-600 uppercase tracking-widest bg-white px-2 py-1 rounded-full shadow-xs border border-pink-100">
                            Hoje! 🎉
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Cake className="w-8 h-8 mb-2 opacity-10" />
                    <p className="text-xs font-medium">Nenhum aniversariante este mês</p>
                  </div>
                )}
              </div>
            </div>

            {/* Online Users Section */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100/50">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <h3 className="font-semibold tracking-tight text-lg">Usuários Online</h3>
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {onlineUsers.length > 0 ? (
                  onlineUsers.map((u) => (
                    <div 
                      key={u.id} 
                      onClick={() => setSelectedUserDetail(u)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-100 hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
                          {u.displayName?.[0] || u.email?.[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">{u.displayName || u.email.split('@')[0]}</p>
                          <p className="text-[10px] text-green-600 font-medium uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-green-500" />
                            Online agora
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <div className="w-8 h-8 mb-2 opacity-10 rounded-full bg-gray-300" />
                    <p className="text-xs font-medium">Ninguém online no momento</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-semibold tracking-tight">Acesso Rápido</h2>
              {isAdmin && (
                <button 
                  onClick={() => {
                    setEditingQuickLink(null);
                    setNewQuickLink({ category: '', icon: 'FolderOpen', links: [{ name: '', url: '' }], order: quickLinks.length });
                    setIsQuickLinkModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#0071E3] hover:text-blue-700 transition-colors bg-blue-50 px-3 py-1.5 rounded-full"
                >
                  <Plus className="w-4 h-4" /> Novo Grupo
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5">
              {quickLinks.length === 0 ? (
                <div className="bg-white rounded-3xl p-6 text-center border border-gray-100/50 text-[#86868B]">
                  Nenhum link configurado.
                </div>
              ) : (
                quickLinks.map((section) => (
                  <div key={section.id} className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100/50">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#1D1D1F]">
                          <FolderOpen className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold tracking-tight text-lg">{section.category}</h3>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingQuickLink(section);
                              setIsQuickLinkModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors bg-white rounded-full shadow-sm border border-gray-100"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickLinkToDelete(section.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors bg-white rounded-full shadow-sm border border-gray-100"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {section.links.map((link: any, linkIdx: number) => (
                        <li key={linkIdx}>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-xl hover:bg-[#F5F5F7] transition-colors group">
                            <span className="text-[#1D1D1F] font-medium">{link.name}</span>
                            <ArrowUpRight className="w-4 h-4 text-[#86868B] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsHelpdeskModalOpen(true)}
                className="w-full mt-2 bg-[#1D1D1F] hover:bg-black text-white rounded-2xl p-4 font-medium flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <FileText className="w-5 h-5" />
                Abrir Chamado (Helpdesk)
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
          </>
        )}

        {currentTab === 'wiki' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-2 text-[#1D1D1F]">
                  Wiki & Guias
                </h1>
                <p className="text-xl text-[#86868B] font-medium tracking-tight">
                  Base de conhecimento e manuais da Dial Network.
                </p>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => { setNewGuide({ ...newGuide, category: wikiTab === 'cotacoes' ? 'Cotações' : wikiTab === 'rh' ? 'RH' : 'Geral' }); setEditingGuide(null); setIsGuideModalOpen(true); }}
                  className="bg-[#1D1D1F] hover:bg-black text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 transition-colors shadow-sm self-start"
                >
                  <Plus className="w-5 h-5" />
                  Novo Guia
                </button>
              )}
            </div>

            {/* Wiki Tabs */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
              <button 
                onClick={() => setWikiTab('cotacoes')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${wikiTab === 'cotacoes' ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                Cotações
              </button>
              <button 
                onClick={() => setWikiTab('limpeza')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${wikiTab === 'limpeza' ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                Limpeza
              </button>
              <button 
                onClick={() => setWikiTab('rh')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${wikiTab === 'rh' ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                RH
              </button>
              <button 
                onClick={() => setWikiTab('outros')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${wikiTab === 'outros' ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                Outros
              </button>
            </div>

            {wikiTab === 'cotacoes' && (
              <div className="space-y-8">
                <QuotationCalculator />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGuides.map((guide) => (
                    <motion.div 
                      key={guide.id}
                      onClick={() => {
                        setSelectedGuide(guide);
                        if (user) logAction(user.uid, `Visualizou guia: ${guide.title}`, { guideId: guide.id });
                      }}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100/50 cursor-pointer group flex flex-col h-full"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                          {guide.category}
                        </span>
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setEditingGuide(guide); setIsEditGuideModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); setGuideToDelete(guide.id); }} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold tracking-tight mb-2 group-hover:text-blue-600 transition-colors">{guide.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{guide.content}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {wikiTab === 'limpeza' && (
              <div className="max-w-4xl mx-auto w-full">
                <CleaningRotation />
              </div>
            )}

            {(wikiTab === 'rh' || wikiTab === 'outros') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGuides.length === 0 ? (
                  <div className="col-span-full py-20 text-center">
                    <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">Nenhum guia nesta categoria</p>
                  </div>
                ) : (
                  filteredGuides.map((guide) => (
                    <motion.div 
                      key={guide.id}
                      onClick={() => setSelectedGuide(guide)}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100/50 cursor-pointer group flex flex-col h-full"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                          {guide.category}
                        </span>
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setEditingGuide(guide); setIsEditGuideModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); setGuideToDelete(guide.id); }} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold tracking-tight mb-2 group-hover:text-blue-600 transition-colors">{guide.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{guide.content}</p>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {currentTab === 'reports' && (
          <Reports userProfile={currentUserData} />
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-100 mt-12 no-print">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="space-y-1">
            <p className="text-sm font-bold text-[#1D1D1F]">Hub Office Home</p>
            <p className="text-xs text-[#86868B]">developed by @pdrnovaes</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#1D1D1F]">Dial Network</p>
            <p className="text-xs text-[#86868B]">17.160.828/0001-00</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[#86868B]">Andradina, SP</p>
            <p className="text-xs text-[#86868B]">18-3722-7376</p>
            <a href="https://www.dialnetwork.com.br" target="_blank" rel="noopener noreferrer" className="text-xs text-[#0071E3] hover:underline font-medium block">
              www.dialnetwork.com.br
            </a>
          </div>
        </div>
      </footer>

      {/* Add Notice Modal */}
      <AnimatePresence>
        {isNoticeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsNoticeModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl"
            >
              <button onClick={() => setIsNoticeModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-semibold tracking-tight mb-6">Novo Aviso</h2>
              <form onSubmit={handleAddNotice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input required type="text" value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0071E3] outline-none transition-all" placeholder="Ex: Nova Política de Reembolso" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select value={newNotice.category} onChange={e => setNewNotice({...newNotice, category: e.target.value})} className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0071E3] outline-none transition-all">
                    <option>Geral</option>
                    <option>Recursos Humanos</option>
                    <option>Tecnologia</option>
                    <option>Comercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
                  <textarea required value={newNotice.excerpt} onChange={e => setNewNotice({...newNotice, excerpt: e.target.value})} rows={4} className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0071E3] outline-none transition-all resize-none" placeholder="Digite o resumo do aviso..." />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="important" checked={newNotice.important} onChange={e => setNewNotice({...newNotice, important: e.target.checked})} className="w-4 h-4 text-[#0071E3] rounded border-gray-300 focus:ring-[#0071E3]" />
                  <label htmlFor="important" className="text-sm font-medium text-gray-700">Marcar como Importante</label>
                </div>
                <button type="submit" className="w-full bg-[#0071E3] hover:bg-blue-700 text-white rounded-xl py-3.5 font-medium mt-6 transition-colors">
                  Publicar Aviso
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Edit Notice Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingNotice(null);
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl"
            >
              <button onClick={() => {
                setIsEditModalOpen(false);
                setEditingNotice(null);
              }} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-semibold tracking-tight mb-6">Editar Aviso</h2>
              <form onSubmit={handleUpdateNotice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input required type="text" value={editingNotice.title} onChange={e => setEditingNotice({...editingNotice, title: e.target.value})} className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0071E3] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select value={editingNotice.category} onChange={e => setEditingNotice({...editingNotice, category: e.target.value})} className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0071E3] outline-none transition-all">
                    <option>Geral</option>
                    <option>Recursos Humanos</option>
                    <option>Tecnologia</option>
                    <option>Comercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
                  <textarea required value={editingNotice.excerpt} onChange={e => setEditingNotice({...editingNotice, excerpt: e.target.value})} rows={4} className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0071E3] outline-none transition-all resize-none" />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="edit-important" checked={editingNotice.important} onChange={e => setEditingNotice({...editingNotice, important: e.target.checked})} className="w-4 h-4 text-[#0071E3] rounded border-gray-300 focus:ring-[#0071E3]" />
                  <label htmlFor="edit-important" className="text-sm font-medium text-gray-700">Marcar como Importante</label>
                </div>
                <button type="submit" className="w-full bg-[#0071E3] hover:bg-blue-700 text-white rounded-xl py-3.5 font-medium mt-6 transition-colors">
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {noticeToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setNoticeToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Excluir Aviso?</h2>
              <p className="text-[#86868B] mb-8">Esta ação não pode ser desfeita. O aviso será removido permanentemente.</p>
              <div className="flex gap-3">
                <button onClick={() => setNoticeToDelete(null)} className="flex-1 bg-[#F5F5F7] hover:bg-gray-200 text-[#1D1D1F] rounded-xl py-3.5 font-medium transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmDeleteNotice} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3.5 font-medium transition-colors">
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Quick Link Confirmation Modal */}
      <AnimatePresence>
        {quickLinkToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setQuickLinkToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Excluir Grupo?</h2>
              <p className="text-[#86868B] mb-8">Esta ação não pode ser desfeita. O grupo e todos os seus links serão removidos.</p>
              <div className="flex gap-3">
                <button onClick={() => setQuickLinkToDelete(null)} className="flex-1 bg-[#F5F5F7] hover:bg-gray-200 text-[#1D1D1F] rounded-xl py-3.5 font-medium transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmDeleteQuickLink} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3.5 font-medium transition-colors">
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Link Modal */}
      <AnimatePresence>
        {isQuickLinkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsQuickLinkModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setIsQuickLinkModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-semibold tracking-tight mb-6">{editingQuickLink ? 'Editar Grupo de Links' : 'Novo Grupo de Links'}</h2>
              <form onSubmit={handleSaveQuickLink} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Grupo</label>
                  <input 
                    required 
                    type="text" 
                    value={editingQuickLink ? editingQuickLink.category : newQuickLink.category} 
                    onChange={e => {
                      if (editingQuickLink) {
                        setEditingQuickLink({...editingQuickLink, category: e.target.value});
                      } else {
                        setNewQuickLink({...newQuickLink, category: e.target.value});
                      }
                    }} 
                    className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0071E3] outline-none transition-all" 
                    placeholder="Ex: Setor Comercial" 
                  />
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">Links</label>
                    <button 
                      type="button"
                      onClick={() => {
                        if (editingQuickLink) {
                          setEditingQuickLink({...editingQuickLink, links: [...editingQuickLink.links, { name: '', url: '' }]});
                        } else {
                          setNewQuickLink({...newQuickLink, links: [...newQuickLink.links, { name: '', url: '' }]});
                        }
                      }}
                      className="text-sm text-[#0071E3] hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Link
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {(editingQuickLink ? editingQuickLink.links : newQuickLink.links).map((link: any, index: number) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <input 
                            required 
                            type="text" 
                            value={link.name} 
                            onChange={e => {
                              const updatedLinks = [...(editingQuickLink ? editingQuickLink.links : newQuickLink.links)];
                              updatedLinks[index].name = e.target.value;
                              if (editingQuickLink) {
                                setEditingQuickLink({...editingQuickLink, links: updatedLinks});
                              } else {
                                setNewQuickLink({...newQuickLink, links: updatedLinks});
                              }
                            }} 
                            className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#0071E3] outline-none transition-all" 
                            placeholder="Nome do Link" 
                          />
                          <input 
                            required 
                            type="url" 
                            value={link.url} 
                            onChange={e => {
                              const updatedLinks = [...(editingQuickLink ? editingQuickLink.links : newQuickLink.links)];
                              updatedLinks[index].url = e.target.value;
                              if (editingQuickLink) {
                                setEditingQuickLink({...editingQuickLink, links: updatedLinks});
                              } else {
                                setNewQuickLink({...newQuickLink, links: updatedLinks});
                              }
                            }} 
                            className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#0071E3] outline-none transition-all" 
                            placeholder="https://" 
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const updatedLinks = [...(editingQuickLink ? editingQuickLink.links : newQuickLink.links)];
                            updatedLinks.splice(index, 1);
                            if (editingQuickLink) {
                              setEditingQuickLink({...editingQuickLink, links: updatedLinks});
                            } else {
                              setNewQuickLink({...newQuickLink, links: updatedLinks});
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-1"
                          disabled={(editingQuickLink ? editingQuickLink.links : newQuickLink.links).length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" className="w-full bg-[#0071E3] hover:bg-blue-700 text-white rounded-xl py-3.5 font-medium mt-6 transition-colors">
                  {editingQuickLink ? 'Salvar Alterações' : 'Criar Grupo'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* View Notice Modal */}
      <AnimatePresence>
        {selectedNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedNotice(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setSelectedNotice(null)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-6 pr-12">
                <span className="text-xs font-medium px-3 py-1 bg-[#F5F5F7] text-[#1D1D1F] rounded-full">
                  {selectedNotice.category}
                </span>
                <span className="text-sm text-[#86868B] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> {selectedNotice.date}
                </span>
                {selectedNotice.authorName && (
                  <span className="text-xs text-[#86868B] bg-gray-100 px-2 py-0.5 rounded-md">
                    por {selectedNotice.authorName}
                  </span>
                )}
                {selectedNotice.important && (
                  <span className="text-xs font-medium px-3 py-1 bg-red-50 text-red-600 rounded-full">
                    Importante
                  </span>
                )}
              </div>
              
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 text-[#1D1D1F]">
                {selectedNotice.title}
              </h2>
              
              <div className="prose prose-lg max-w-none text-[#1D1D1F] whitespace-pre-wrap">
                {selectedNotice.excerpt}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Floating Action Button (FAB) for Helpdesk */}
      {user && userStatus === 'approved' && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1, y: -5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsHelpdeskModalOpen(true)}
          className="fixed bottom-8 right-8 z-[60] bg-[#1D1D1F] text-white p-5 rounded-full shadow-2xl flex items-center justify-center group hover:bg-black transition-all"
          title="Abrir Chamado"
        >
          <FileText className="w-6 h-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-500 whitespace-nowrap font-bold text-sm uppercase tracking-wider">
            Abrir Chamado
          </span>
        </motion.button>
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-black/5 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-emerald-600" />
                Meu Perfil
              </h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome ou Apelido</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={profileData.displayName}
                  onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                  placeholder="Como quer ser chamado?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cargo</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={profileData.jobTitle}
                    onChange={(e) => setProfileData({ ...profileData, jobTitle: e.target.value })}
                    placeholder="Ex: Analista de TI"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Setor</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={profileData.department}
                    onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                    placeholder="Ex: Suporte"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sexo</label>
                  <select
                    className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={profileData.gender}
                    onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                  >
                    <option value="">Selecionar</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Aniversário</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={profileData.birthDate}
                    onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Telefone</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-black/10 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      <AnimatePresence>
        {isUserManagementOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsUserManagementOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setIsUserManagementOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-semibold tracking-tight mb-6">Gerenciar Usuários</h2>
              
              <div className="mb-6 p-4 bg-[#F5F5F7] rounded-xl">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Convidar Novo Usuário</h3>
                <div className="flex gap-2">
                  <input type="email" placeholder="Email do usuário" className="flex-1 bg-white border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#0071E3] outline-none" id="inviteEmail" />
                  <button onClick={handleInviteUser} className="bg-[#0071E3] text-white px-4 py-2 rounded-xl hover:bg-blue-700">Convidar</button>
                </div>
              </div>

              <div className="space-y-4">
                {usersList.map(u => (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F5F5F7] rounded-xl gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${u.online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                        <p className="font-medium text-[#1D1D1F] truncate max-w-[200px] sm:max-w-none">{u.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <div className="flex flex-col">
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full w-fit ${
                            u.status === 'approved' ? 'bg-green-100 text-green-700' : 
                            u.status === 'denied' ? 'bg-red-100 text-red-700' : 
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {u.status === 'approved' ? 'Aprovado' : u.status === 'denied' ? 'Negado' : 'Pendente'}
                          </span>
                          {u.lastLogin && (
                            <span className="text-[10px] text-[#86868B] flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              Acesso: {new Date(u.lastLogin.seconds * 1000).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                        {u.lastAction && <span className="bg-gray-100 px-1.5 py-0.5 rounded italic">Última: {u.lastAction}</span>}
                        {u.totalActivitySeconds && (
                          <span className="text-[10px] text-[#86868B] bg-blue-50 px-1.5 py-0.5 rounded">
                            Total: {Math.floor(u.totalActivitySeconds / 3600)}h {Math.floor((u.totalActivitySeconds % 3600) / 60)}m
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <button 
                        onClick={() => {
                          setEditUserData({
                            id: u.id,
                            displayName: u.displayName || '',
                            jobTitle: u.jobTitle || '',
                            department: u.department || '',
                            phone: u.phone || '',
                            birthDate: u.birthDate || '',
                            gender: u.gender || ''
                          });
                          setIsEditUserModalOpen(true);
                        }}
                        className="p-2 text-gray-500 hover:text-emerald-600 transition-colors bg-white rounded-lg shadow-sm"
                        title="Editar Usuário"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setViewingUser(u);
                          fetchUserLogs(u.id);
                          setIsLogsModalOpen(true);
                        }}
                        className="p-2 text-gray-500 hover:text-[#0071E3] transition-colors bg-white rounded-lg shadow-sm"
                        title="Ver Logs"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      
                      {u.status === 'pending' && (
                        <>
                          <button onClick={() => handleUpdateUserStatus(u.id, 'approved')} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium">Aprovar</button>
                          <button onClick={() => handleUpdateUserStatus(u.id, 'denied')} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-medium">Negar</button>
                        </>
                      )}
                      
                      <select 
                        value={u.role}
                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        disabled={u.email === 'mrlolpedro@gmail.com' || u.id === user.uid}
                        className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#0071E3] outline-none disabled:opacity-50 font-medium"
                      >
                        <option value="user">Usuário</option>
                        <option value="admin">Admin</option>
                      </select>

                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.email === 'mrlolpedro@gmail.com' || u.id === user.uid}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-white rounded-lg shadow-sm disabled:opacity-30"
                        title="Excluir Usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Edit User Modal */}
      <AnimatePresence>
        {isEditUserModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between bg-gray-50">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Edit className="w-5 h-5 text-emerald-600" />
                  Editar Usuário
                </h3>
                <button onClick={() => setIsEditUserModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAdminUpdateUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome ou Apelido</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={editUserData.displayName}
                    onChange={(e) => setEditUserData({ ...editUserData, displayName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cargo</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={editUserData.jobTitle}
                      onChange={(e) => setEditUserData({ ...editUserData, jobTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Setor</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={editUserData.department}
                      onChange={(e) => setEditUserData({ ...editUserData, department: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sexo</label>
                    <select
                      className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={editUserData.gender}
                      onChange={(e) => setEditUserData({ ...editUserData, gender: e.target.value })}
                    >
                      <option value="">Selecionar</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Aniversário</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={editUserData.birthDate}
                      onChange={(e) => setEditUserData({ ...editUserData, birthDate: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Telefone</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={editUserData.phone}
                    onChange={(e) => setEditUserData({ ...editUserData, phone: formatPhone(e.target.value) })}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditUserModalOpen(false)}
                    className="flex-1 px-4 py-2 rounded-xl border border-black/10 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Logs Modal */}
      <AnimatePresence>
        {isLogsModalOpen && viewingUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsLogsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <button onClick={() => setIsLogsModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
              
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Atividade do Usuário</h2>
                <p className="text-sm text-[#86868B] truncate">{viewingUser.email}</p>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {selectedUserLogs.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Nenhuma atividade registrada.</p>
                ) : (
                  selectedUserLogs.map((log, idx) => (
                    <div key={idx} className="p-3 bg-[#F5F5F7] rounded-xl border border-gray-100">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-medium text-[#1D1D1F]">{log.action}</p>
                        <p className="text-[10px] text-[#86868B]">
                          {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('pt-BR') : 'Agora'}
                        </p>
                      </div>
                      {log.details && (
                        <div className="mt-2 p-2 bg-white/50 rounded-lg text-[10px] text-[#86868B] font-mono whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Create Guide Modal */}
      <AnimatePresence>
        {isGuideModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsGuideModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setIsGuideModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-semibold tracking-tight mb-6">Novo Guia</h2>
              <form onSubmit={handleSaveGuide} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input required type="text" value={newGuide.title} onChange={e => setNewGuide({...newGuide, title: e.target.value})} className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0071E3] outline-none transition-all" placeholder="Ex: Como realizar uma cotação internacional" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <input required type="text" value={newGuide.category} onChange={e => setNewGuide({...newGuide, category: e.target.value})} className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0071E3] outline-none transition-all" placeholder="Ex: Cotação Internacional" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
                  <textarea required value={newGuide.content} onChange={e => setNewGuide({...newGuide, content: e.target.value})} rows={8} className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0071E3] outline-none transition-all resize-none" placeholder="Escreva o conteúdo do guia aqui..." />
                </div>
                <button type="submit" className="w-full bg-[#0071E3] hover:bg-blue-700 text-white rounded-xl py-3.5 font-medium mt-6 transition-colors">
                  Publicar Guia
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Guide Modal */}
      <AnimatePresence>
        {isEditGuideModalOpen && editingGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setIsEditGuideModalOpen(false);
                setEditingGuide(null);
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => {
                setIsEditGuideModalOpen(false);
                setEditingGuide(null);
              }} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-semibold tracking-tight mb-6">Editar Guia</h2>
              <form onSubmit={handleSaveGuide} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input required type="text" value={editingGuide.title} onChange={e => setEditingGuide({...editingGuide, title: e.target.value})} className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0071E3] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <input required type="text" value={editingGuide.category} onChange={e => setEditingGuide({...editingGuide, category: e.target.value})} className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0071E3] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
                  <textarea required value={editingGuide.content} onChange={e => setEditingGuide({...editingGuide, content: e.target.value})} rows={8} className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0071E3] outline-none transition-all resize-none" />
                </div>
                <button type="submit" className="w-full bg-[#0071E3] hover:bg-blue-700 text-white rounded-xl py-3.5 font-medium mt-6 transition-colors">
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Guide Modal */}
      <AnimatePresence>
        {selectedGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedGuide(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setSelectedGuide(null)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-6 pr-12">
                <span className="text-xs font-medium px-3 py-1 bg-[#F5F5F7] text-[#1D1D1F] rounded-full">
                  {selectedGuide.category}
                </span>
                {selectedGuide.createdAt && (
                  <span className="text-sm text-[#86868B] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> 
                    {new Date(selectedGuide.createdAt.seconds * 1000).toLocaleDateString('pt-BR')}
                  </span>
                )}
                {selectedGuide.authorName && (
                  <span className="text-xs text-[#86868B] bg-gray-100 px-2 py-0.5 rounded-md">
                    por {selectedGuide.authorName}
                  </span>
                )}
              </div>
              
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 text-[#1D1D1F]">
                {selectedGuide.title}
              </h2>
              
              <div className="prose prose-lg max-w-none text-[#1D1D1F] whitespace-pre-wrap">
                {selectedGuide.content}
              </div>
              

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Guide Confirmation Modal */}
      <AnimatePresence>
        {guideToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setGuideToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Excluir Guia?</h2>
              <p className="text-[#86868B] mb-8">Esta ação não pode ser desfeita. O guia será removido permanentemente.</p>
              <div className="flex gap-3">
                <button onClick={() => setGuideToDelete(null)} className="flex-1 bg-[#F5F5F7] hover:bg-gray-200 text-[#1D1D1F] rounded-xl py-3.5 font-medium transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmDeleteGuide} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3.5 font-medium transition-colors">
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setUserToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Excluir Usuário?</h2>
              <p className="text-[#86868B] mb-8">Esta ação removerá o usuário e todos os seus logs de atividade permanentemente.</p>
              <div className="flex gap-3">
                <button onClick={() => setUserToDelete(null)} className="flex-1 bg-[#F5F5F7] hover:bg-gray-200 text-[#1D1D1F] rounded-xl py-3.5 font-medium transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmDeleteUser} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3.5 font-medium transition-colors">
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Ticket Success Modal */}
      <AnimatePresence>
        {isTicketSuccessOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setIsTicketSuccessOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                >
                  <CheckCircle2 className="w-12 h-12" />
                </motion.div>
              </div>
              
              <h2 className="text-2xl font-bold text-[#1D1D1F] mb-2">Chamado Aberto!</h2>
              <p className="text-[#86868B] mb-8">
                Sua solicitação foi enviada com sucesso. Nossa equipe de suporte entrará em contato em breve.
              </p>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsTicketSuccessOpen(false)}
                className="w-full py-4 bg-[#1D1D1F] text-white rounded-2xl font-bold shadow-lg hover:bg-black transition-colors"
              >
                Entendido
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Helpdesk Modal */}
      <AnimatePresence>
        {isHelpdeskModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsHelpdeskModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl"
            >
              <button 
                onClick={() => setIsHelpdeskModalOpen(false)} 
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-[#1D1D1F]">Abrir Chamado</h2>
                <p className="text-[#86868B]">Descreva o problema ou solicitação para o time de TI.</p>
              </div>

              <form onSubmit={handleOpenTicket} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Assunto</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={ticketData.subject}
                    onChange={(e) => setTicketData({ ...ticketData, subject: e.target.value })}
                    placeholder="Ex: Problema com e-mail"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Categoria</label>
                    <select
                      className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={ticketData.category}
                      onChange={(e) => setTicketData({ ...ticketData, category: e.target.value })}
                    >
                      <option value="TI">TI / Suporte</option>
                      <option value="RH">RH</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="Manutenção">Manutenção</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Prioridade</label>
                    <select
                      className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={ticketData.priority}
                      onChange={(e) => setTicketData({ ...ticketData, priority: e.target.value })}
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Descrição</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full px-4 py-2 rounded-xl border border-black/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    value={ticketData.description}
                    onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                    placeholder="Descreva detalhadamente sua solicitação..."
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsHelpdeskModalOpen(false)}
                    className="flex-1 px-4 py-2 rounded-xl border border-black/10 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Enviar Chamado
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUserDetail && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedUserDetail(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setSelectedUserDetail(null)} 
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#0071E3] to-[#42A5F5] text-white flex items-center justify-center text-3xl font-bold mb-4 shadow-lg">
                  {selectedUserDetail.displayName?.[0] || selectedUserDetail.email?.[0].toUpperCase()}
                </div>
                
                <h2 className="text-2xl font-bold text-[#1D1D1F] mb-1">
                  {selectedUserDetail.displayName || 'Usuário'}
                </h2>
                {selectedUserDetail.jobTitle && (
                  <p className="text-xs font-bold text-[#0071E3] uppercase tracking-widest mb-1">
                    {selectedUserDetail.jobTitle}
                  </p>
                )}
                {selectedUserDetail.department && (
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-4">
                    Setor: {selectedUserDetail.department}
                  </p>
                )}
                <p className="text-sm text-[#86868B] mb-6">{selectedUserDetail.email}</p>

                <div className="w-full space-y-4 text-left bg-[#F5F5F7] p-6 rounded-3xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#0071E3] shadow-sm">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Telefone</p>
                      <p className="text-sm font-medium text-[#1D1D1F]">{selectedUserDetail.phone || 'Não informado'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-pink-500 shadow-sm">
                      <Cake className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aniversário</p>
                      <p className="text-sm font-medium text-[#1D1D1F]">
                        {selectedUserDetail.birthDate ? (() => {
                          const [y, m, d] = selectedUserDetail.birthDate.split('-');
                          return `${d}/${m}/${y}`;
                        })() : 'Não informado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                      <div className={`w-2 h-2 rounded-full ${selectedUserDetail.online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
                      <p className="text-sm font-medium text-[#1D1D1F]">
                        {selectedUserDetail.online ? 'Online agora' : 'Offline'}
                      </p>
                    </div>
                  </div>

                  {selectedUserDetail.lastLogin && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-orange-500 shadow-sm">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Último Acesso</p>
                        <p className="text-sm font-medium text-[#1D1D1F]">
                          {new Date(selectedUserDetail.lastLogin.seconds * 1000).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <IntranetApp />
    </ErrorBoundary>
  );
}
