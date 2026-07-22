import React, { useState, useEffect } from 'react';
import { calculateFlatness, Point3D, FlatnessResult, CalculationMethod } from './lib/flatness';
import { FlangeVisualizer } from './components/FlangeVisualizer';
import { Calculator, Play, RotateCcw, Table2, Printer, Archive, Save, Lock, Unlock, Plus, Trash2, X, Cog } from 'lucide-react';
import { cn } from './lib/utils';

interface FlangeData {
  pointCount: number;
  measurements: string[];
  method: CalculationMethod;
  result: FlatnessResult | null;
  error: string | null;
}

interface BracketRecord {
  id: string;
  name: string;
  createdAt: number;
  isLocked: boolean;
  flanges: [FlangeData, FlangeData];
}

const defaultFlange = (): FlangeData => ({
  pointCount: 36,
  measurements: Array(36).fill(''),
  method: 'symmetric',
  result: null,
  error: null
});

export default function App() {
  const [currentId, setCurrentId] = useState<string>(() => crypto.randomUUID());
  const [elementName, setElementName] = useState('Corner Bracket nr 1');
  const [flanges, setFlanges] = useState<[FlangeData, FlangeData]>([defaultFlange(), defaultFlange()]);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [showArchive, setShowArchive] = useState(false);

  const [archive, setArchive] = useState<BracketRecord[]>(() => {
    const saved = localStorage.getItem('flange-archive');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('flange-archive', JSON.stringify(archive));
  }, [archive]);

  const activeFlange = flanges[activeTab];

  const updateActiveFlange = (updates: Partial<FlangeData>) => {
    if (isLocked) return;
    setFlanges(prev => {
      const next = [...prev] as [FlangeData, FlangeData];
      const active = { ...next[activeTab], ...updates };
      
      if ('measurements' in updates || 'method' in updates) {
        const lastFilledIndex = active.measurements.reduce((acc, val, i) => (val && String(val).trim() !== '' ? i : acc), -1);
        
        // Zapewniamy miejsce do wpisywania - zawsze minimum 12, a generalnie kilka pustych na końcu
        const optimalLength = Math.max(12, lastFilledIndex + 4);
        const normalizedMeasurements = [...active.measurements];
        while (normalizedMeasurements.length < optimalLength) normalizedMeasurements.push('');
        normalizedMeasurements.length = optimalLength;
        active.measurements = normalizedMeasurements;

        const computedPointCount = Math.max(3, lastFilledIndex + 1);
        active.pointCount = computedPointCount;

        const parsedPoints: Point3D[] = [];
        for (let i = 0; i < computedPointCount; i++) {
          const m = active.measurements[i];
          if (!m || String(m).trim() === '') continue;

          const val = parseFloat(String(m).replace(',', '.'));
          if (!isNaN(val)) {
            const angle = Math.PI - (i * 2 * Math.PI) / computedPointCount;
            const x = Math.cos(angle);
            const y = Math.sin(angle);

            parsedPoints.push({
              id: `P${i + 1}`,
              x,
              y,
              z: val
            });
          }
        }

        if (parsedPoints.length >= 3) {
          try {
            active.result = calculateFlatness(parsedPoints, active.method);
            active.error = null;
          } catch (err: any) {
            active.error = err.message || 'Błąd obliczeń';
            active.result = null;
          }
        } else {
          active.result = null;
          active.error = null;
        }
      }

      next[activeTab] = active;
      return next;
    });
  };

  const handleNew = () => {
    setCurrentId(crypto.randomUUID());
    setElementName('Nowy Element');
    setFlanges([defaultFlange(), defaultFlange()]);
    setIsLocked(false);
    setActiveTab(0);
  };

  const handleSave = () => {
    const record: BracketRecord = {
      id: currentId,
      name: elementName || 'Bez nazwy',
      createdAt: Date.now(),
      isLocked,
      flanges
    };

    setArchive(prev => {
      const idx = prev.findIndex(r => r.id === currentId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      } else {
        return [record, ...prev];
      }
    });
  };

  const handleLoad = (record: BracketRecord) => {
    setCurrentId(record.id);
    setElementName(record.name);
    setFlanges(record.flanges);
    setIsLocked(record.isLocked);
    setShowArchive(false);
  };

  const handleDelete = (id: string) => {
    setArchive(prev => prev.filter(r => r.id !== id));
    if (currentId === id) {
      handleNew();
    }
  };

  const handleToggleLock = () => {
    const newLockState = !isLocked;
    setIsLocked(newLockState);
    
    if (archive.some(r => r.id === currentId)) {
      setArchive(prev => prev.map(r => r.id === currentId ? { ...r, isLocked: newLockState } : r));
    }
  };



  const handleInputChange = (index: number, value: string) => {
    if (isLocked) return;
    const newM = [...activeFlange.measurements];
    newM[index] = value;
    updateActiveFlange({ measurements: newM });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startIndex: number) => {
    if (isLocked) return;
    const paste = e.clipboardData.getData('text');
    const lines = paste.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length > 0) {
      e.preventDefault();
      const newM = [...activeFlange.measurements];
      lines.forEach((line, i) => {
        const idx = startIndex + i;
        const parts = line.trim().split(/[\t; ]+/).filter(Boolean);
        const val = parts.length > 1 ? parts[parts.length - 1] : parts[0];
        if (val !== undefined) {
          while (newM.length <= idx) newM.push('');
          newM[idx] = val;
        }
      });
      updateActiveFlange({ measurements: newM });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 print:bg-white print:pb-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      
      {/* RAPORT DO DRUKU */}
      <div className="hidden print:block w-full max-w-5xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8 uppercase text-slate-800">{elementName}</h1>
        
        <div className="flex flex-col gap-16">
          {flanges.map((flange, idx) => (
            <div key={idx} className="flex flex-col items-center" style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-2xl font-bold mb-2">Kołnierz {idx + 1}</h2>
              <p className="text-slate-500 font-medium mb-6">
                Metoda: {
                  flange.method === 'symmetric' ? 'Symetryczne Zero' :
                  flange.method === 'highest' ? 'Najwyższe Zero (3 punkty)' : 
                  'MNK (Najmniejszych Kwadratów)'
                }
              </p>
              
              {flange.result ? (
                <>
                  <div className="flex items-center justify-center gap-12 mb-6">
                    <div className="text-center">
                      <p className="text-sm text-slate-500">Całkowity Błąd Płaskości</p>
                      <p className="text-2xl font-bold text-slate-900">{flange.result.totalError.toFixed(2)} mm</p>
                    </div>
                    {flange.result.supportPoints.length > 0 && (
                      <div className="text-center">
                        <p className="text-sm text-slate-500">Punkty Styku (Zero)</p>
                        <p className="text-xl font-bold text-teal-700">{flange.result.supportPoints.map(sp => sp.replace('P', 'Nr ')).join(', ')}</p>
                      </div>
                    )}
                  </div>

                  <div className="w-[180mm] h-[180mm] mx-auto border border-slate-100 rounded-xl p-4 bg-white shadow-sm">
                    <FlangeVisualizer points={flange.result.points} maxGap={flange.result.maxGap} />
                  </div>

                  <div className="w-full mt-12 mb-4 px-8">
                    <h3 className="font-bold text-lg mb-4 text-center border-b pb-2">Tabela Odchyłek (mm)</h3>
                    <div className="grid grid-cols-4 gap-x-8 gap-y-2 text-sm">
                      {flange.result.points.map(p => (
                        <div key={p.id} className="flex justify-between border-b border-slate-200 py-1 px-1">
                          <span className="font-medium text-slate-600">{p.id.replace('P', 'Nr ')}</span>
                          <span className={cn(
                            "font-mono font-bold",
                            Math.abs(p.gap || 0) < 0.001 ? "text-teal-600" : p.gap! > 0 ? "text-amber-600" : "text-rose-600"
                          )}>
                            {Math.abs(p.gap || 0) < 0.001 ? "0.00" : p.gap! > 0 ? `+${p.gap!.toFixed(2)}` : p.gap!.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-slate-500 py-10 border border-dashed rounded-xl w-full text-center">Brak danych pomiarowych</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* APLIKACJA (NIE DRUKOWANA) */}
      <div className="print:hidden">
        <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <Calculator className="w-8 h-8 text-teal-400 shrink-0" />
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">Płaskość Kołnierzy</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              <input 
                type="text" 
                value={elementName}
                onChange={(e) => setElementName(e.target.value)}
                readOnly={isLocked}
                placeholder="Nazwa elementu..."
                className={cn(
                  "bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[150px] sm:w-64",
                  isLocked && "opacity-70 cursor-not-allowed"
                )}
              />
              
              <button 
                onClick={handleSave}
                className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded flex items-center gap-2 transition-colors shrink-0"
                title="Zapisz do archiwum"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Zapisz</span>
              </button>

              <button 
                onClick={handleToggleLock}
                className={cn(
                  "px-3 py-2 rounded flex items-center gap-2 transition-colors shrink-0",
                  isLocked ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"
                )}
                title={isLocked ? "Odblokuj edycję" : "Zablokuj przed edycją"}
              >
                {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>

              <div className="w-px h-6 bg-slate-700 mx-1 shrink-0"></div>

              <button 
                onClick={handlePrint}
                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded flex items-center gap-2 transition-colors shrink-0"
                title="Drukuj raport"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setShowArchive(true)}
                className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white px-3 py-2 rounded flex items-center gap-2 transition-colors shrink-0"
                title="Archiwum pomiarów"
              >
                <Archive className="w-4 h-4" />
                {archive.length > 0 && (
                  <span className="bg-teal-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {archive.length}
                  </span>
                )}
              </button>

              <button 
                onClick={handleNew}
                className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white px-3 py-2 rounded flex items-center gap-2 transition-colors shrink-0"
                title="Nowy pomiar"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative">
          <div className="flex space-x-2">
            {[0, 1].map((tabIndex) => (
              <button
                key={tabIndex}
                onClick={() => setActiveTab(tabIndex as 0 | 1)}
                className={cn(
                  "px-6 py-3 rounded-t-xl font-bold text-sm transition-colors",
                  activeTab === tabIndex 
                    ? "bg-white text-teal-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-l border-r border-slate-200" 
                    : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                )}
              >
                Kołnierz {tabIndex + 1}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-white p-6 rounded-b-xl rounded-tr-xl shadow-sm border border-slate-200 -mt-8 relative z-10">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium flex items-center space-x-2">
                    <Table2 className="w-5 h-5 text-slate-500" />
                    <span>Odczyty: Kołnierz {activeTab + 1}</span>
                  </h3>
                </div>
                <div className="p-4 flex-grow flex flex-col space-y-4">
                  
                  <div className="bg-slate-100 p-3 rounded-lg flex flex-col gap-2 border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                      <Cog className="w-3.5 h-3.5" /> Metoda Obliczeń
                    </span>
                    <select
                      value={activeFlange.method}
                      onChange={(e) => updateActiveFlange({ method: e.target.value as CalculationMethod })}
                      disabled={isLocked}
                      className="text-sm border border-slate-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="symmetric">Symetryczne Zero (Gwiazda)</option>
                      <option value="highest">Najwyższe Zero (3 punkty)</option>
                      <option value="least-squares">MNK (Najmniejszych Kwadratów)</option>
                    </select>
                  </div>

                  <p className="text-xs text-slate-500">
                    Wpisz odczyty ręcznie lub skopiuj kolumnę z Excela i <strong>wklej do pierwszego okienka</strong>.
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto max-h-[500px] pr-2">
                    {activeFlange.measurements.map((val, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-slate-400 w-5 text-right">{idx + 1}.</span>
                        <input 
                          type="text"
                          value={val}
                          onChange={(e) => handleInputChange(idx, e.target.value)}
                          onPaste={(e) => handlePaste(e, idx)}
                          disabled={isLocked}
                          placeholder="0.0"
                          className={cn(
                            "w-full border border-slate-200 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500",
                            isLocked && "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100"
                          )}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => {
                        if (!isLocked) {
                          updateActiveFlange({ measurements: Array(36).fill(''), result: null, error: null });
                        }
                      }}
                      disabled={isLocked}
                      title="Wyczyść pomiary"
                      className={cn(
                        "w-full py-4 px-4 rounded-lg shadow-md font-bold flex items-center justify-center transition-all space-x-2",
                        isLocked 
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                          : "bg-slate-200 hover:bg-slate-300 text-slate-700 active:scale-[0.98]"
                      )}
                    >
                      <Trash2 className="w-5 h-5" />
                      <span>Wyczyść pomiary</span>
                    </button>
                  </div>
                  {activeFlange.error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-sm">
                      {activeFlange.error}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {activeFlange.result ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                      <span className="text-sm font-medium text-slate-500 mb-1">Całkowity Błąd Płaskości (Max-Min)</span>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-4xl font-bold text-slate-900">{activeFlange.result.totalError.toFixed(2)}</span>
                        <span className="text-lg font-medium text-slate-500">mm</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                      <span className="text-sm font-medium text-slate-500 mb-1">Punkty Styku (Zero)</span>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-teal-600">
                          {activeFlange.result.supportPoints.length > 0 
                            ? activeFlange.result.supportPoints.map(sp => sp.replace('P', 'Nr ')).join(', ')
                            : 'Metoda MNK (Płaszczyzna wirtualna)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <h3 className="font-medium text-slate-900">Wizualizacja Płaskości na Kołnierzu</h3>
                    </div>
                    <div className="p-0">
                      <FlangeVisualizer points={activeFlange.result.points} maxGap={activeFlange.result.maxGap} pointCount={activeFlange.pointCount} />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <h3 className="font-medium text-slate-900">Tabela Szczelin (Odchyłki od płaszczyzny styku)</h3>
                    </div>
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-600 bg-slate-50 uppercase border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-6 py-3 font-semibold">Nr Otworu</th>
                            <th className="px-6 py-3 font-semibold">Odczyt (z łaty)</th>
                            <th className="px-6 py-3 font-semibold text-teal-700">Szczelina (mm)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeFlange.result.points.map((p, idx) => (
                            <tr 
                              key={idx} 
                              className={cn("hover:bg-slate-50 transition-colors", Math.abs(p.gap || 0) < 0.001 && "bg-teal-50/50")}
                            >
                              <td className="px-6 py-3 font-medium text-slate-900">{p.id.replace('P', '')}</td>
                              <td className="px-6 py-3 font-mono text-slate-500">{p.z.toFixed(2)}</td>
                              <td className="px-6 py-3">
                                <span className={cn(
                                  "font-mono font-medium",
                                  Math.abs(p.gap || 0) < 0.001 ? "text-teal-600 font-bold" : 
                                  Math.abs(p.gap!) > activeFlange.result!.maxGap * 0.7 ? "text-rose-600" : 
                                  Math.abs(p.gap!) > activeFlange.result!.maxGap * 0.4 ? "text-amber-500" : "text-slate-600"
                                )}>
                                  {Math.abs(p.gap || 0) < 0.001 ? "0.00" : p.gap! > 0 ? `+${p.gap!.toFixed(2)}` : p.gap!.toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full bg-slate-100 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-12 text-center text-slate-500">
                  <RotateCcw className="w-12 h-12 mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-700">Oczekuję na dane...</h3>
                  <p className="mt-1 max-w-sm">Wklej swoje wyniki po lewej stronie i naciśnij zielony przycisk "Oblicz Płaskość".</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showArchive && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end print:hidden">
          <div className="bg-slate-50 w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Archive className="w-5 h-5 text-teal-600" /> 
                Archiwum Pomiarów
              </h2>
              <button 
                onClick={() => setShowArchive(false)} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {archive.length === 0 ? (
                <div className="text-center text-slate-500 mt-10">
                  <Archive className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Brak zapisanych pomiarów w przeglądarce.</p>
                </div>
              ) : (
                archive.sort((a,b) => b.createdAt - a.createdAt).map(record => (
                  <div 
                    key={record.id} 
                    className={cn(
                      "bg-white border rounded-lg p-4 shadow-sm hover:border-teal-400 transition-colors cursor-pointer flex justify-between items-center group", 
                      currentId === record.id ? "border-teal-500 ring-1 ring-teal-500" : "border-slate-200"
                    )} 
                    onClick={() => handleLoad(record)}
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        {record.name}
                        {record.isLocked && <Lock className="w-3 h-3 text-rose-500" title="Zablokowane" />}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">{new Date(record.createdAt).toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                      disabled={record.isLocked}
                      title={record.isLocked ? "Odblokuj, aby usunąć" : "Usuń"}
                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
