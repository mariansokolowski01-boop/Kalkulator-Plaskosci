import React, { useState } from 'react';
import { X, Calculator, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onClose: () => void;
}

export function TheodoliteCalculator({ onClose }: Props) {
  const [d1, setD1] = useState<string>('');
  const [h1, setH1] = useState<string>('');
  const [dBetween, setDBetween] = useState<string>('');
  const [h2, setH2] = useState<string>('');

  const cleanNumber = (val: string) => {
    // Usunięcie spacji i zamiana przecinka na kropkę
    const cleaned = val.replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned);
  };

  const dist1 = cleanNumber(d1);
  const read1 = cleanNumber(h1);
  const distBetween = cleanNumber(dBetween);
  const read2 = cleanNumber(h2);

  let targetReading: number | null = null;
  let slopePerMeter: number | null = null;
  let totalDiff: number | null = null;

  if (!isNaN(dist1) && !isNaN(read1) && !isNaN(distBetween) && !isNaN(read2) && distBetween > 0) {
    totalDiff = read2 - read1;
    const slope = totalDiff / distBetween;
    slopePerMeter = slope * 1000;
    // H = R_near - d_near * slope
    targetReading = read1 - dist1 * slope;
  }

  const isSuspiciouslySmallBase = !isNaN(distBetween) && distBetween > 0 && distBetween < 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm sm:p-6 print:hidden">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center bg-slate-900 text-white p-4">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold">Kalkulator Teodolitu</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          <p className="text-sm text-slate-600">
            Obliczanie dokładnej odległości w milimetrach, aby odczyty na obu miarkach (bliskiej i dalekiej) zgrały się w jednej linii równoległej do mierzonej powierzchni.
          </p>

          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-3 text-sm uppercase">Miarka Bliska</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Odczyt (mm)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={h1}
                    onChange={e => setH1(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Odl. od teodolitu (mm)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={d1}
                    onChange={e => setD1(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-3 text-sm uppercase">Miarka Daleka</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Odczyt (mm)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={h2}
                    onChange={e => setH2(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Baza / Odl. między miarkami (mm)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={dBetween}
                    onChange={e => setDBetween(e.target.value)}
                    className={cn(
                      "w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:outline-none",
                      isSuspiciouslySmallBase ? "border-amber-400 focus:ring-amber-500 bg-amber-50" : "border-slate-300 focus:ring-teal-500"
                    )}
                    placeholder="0"
                  />
                </div>
              </div>
              
              {isSuspiciouslySmallBase && (
                <div className="mt-3 flex items-start space-x-2 text-amber-700 bg-amber-100/50 p-2 rounded text-xs font-medium border border-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    Wpisałeś bazę <strong>{distBetween} mm</strong>. Jeśli miałeś na myśli metry, wpisz <strong>{distBetween * 1000}</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className={cn(
            "p-5 rounded-lg border-2 transition-colors",
            targetReading !== null 
              ? "bg-teal-50 border-teal-200" 
              : "bg-slate-100 border-slate-200"
          )}>
            <h3 className="font-bold text-slate-800 mb-4 text-center">Wynik Korekty</h3>
            
            {targetReading !== null && slopePerMeter !== null && totalDiff !== null ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-teal-100 pb-2">
                  <span className="text-slate-600">Różnica wysokości na bazie:</span>
                  <span className="font-mono font-bold text-slate-900">{totalDiff > 0 ? '+' : ''}{totalDiff.toFixed(1)} mm</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-teal-100 pb-2">
                  <span className="text-slate-600">Spadek / Błąd na 1m:</span>
                  <span className="font-mono font-bold text-slate-900">{slopePerMeter > 0 ? '+' : ''}{slopePerMeter.toFixed(2)} mm/m</span>
                </div>
                <div className="pt-2 text-center">
                  <p className="text-sm text-slate-600 mb-2">Idealny odczyt po zgraniu płaszczyzn:</p>
                  <div className="text-3xl font-bold text-teal-700 font-mono bg-white inline-block px-4 py-2 rounded shadow-sm border border-teal-100">
                    {targetReading.toFixed(1)} mm
                  </div>
                  <p className="text-xs text-slate-500 mt-3 max-w-[280px] mx-auto">
                    Przestaw teodolit tak, aby odczyt na <strong>obu miarkach</strong> wynosił dokładnie {targetReading.toFixed(1)} mm.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 text-sm py-4">
                Wprowadź poprawne dane liczbowe, aby zobaczyć wynik.
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t bg-slate-50">
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors focus:ring-2 focus:ring-slate-400 focus:outline-none"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
