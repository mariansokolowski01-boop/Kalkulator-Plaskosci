import React, { useState } from 'react';
import { X, Calculator, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onClose: () => void;
}

export function TheodoliteCalculator({ onClose }: Props) {
  const [d1, setD1] = useState<string>('');
  const [h1, setH1] = useState<string>('');
  const [dBetween, setDBetween] = useState<string>('');
  const [h2, setH2] = useState<string>('');

  const dist1 = parseFloat(d1.replace(',', '.'));
  const read1 = parseFloat(h1.replace(',', '.'));
  const distBetween = parseFloat(dBetween.replace(',', '.'));
  const read2 = parseFloat(h2.replace(',', '.'));

  let targetReading: number | null = null;
  let slopePerMeter: number | null = null;
  let totalDiff: number | null = null;

  if (!isNaN(dist1) && !isNaN(read1) && !isNaN(distBetween) && !isNaN(read2) && distBetween > 0) {
    totalDiff = read2 - read1;
    slopePerMeter = totalDiff / distBetween;
    // H = R_near - d_near * slope
    targetReading = read1 - dist1 * slopePerMeter;
  }

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
            
          </p>

          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-3 text-sm uppercase">Miarka Bliska</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Odczyt (mm)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={h1}
                    onChange={e => setH1(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="np. 357"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Odl. od teodolitu (m)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={d1}
                    onChange={e => setD1(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="np. 2"
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
                    type="number"
                    inputMode="decimal"
                    value={h2}
                    onChange={e => setH2(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="np. 645"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Baza / Odl. między miarkami (m)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={dBetween}
                    onChange={e => setDBetween(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="np. 8"
                  />
                </div>
              </div>
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
