export type CalculationMethod = 'symmetric' | 'highest' | 'least-squares';

export interface Point3D {
  id: string;
  x: number;
  y: number;
  z: number;
  gap?: number;
}

export interface FlatnessResult {
  points: Point3D[];
  maxGap: number;
  totalError: number;
  referencePlane: { a: number; b: number; c: number };
  supportPoints: string[];
}

export function calculateFlatness(points: Point3D[], method: CalculationMethod = 'symmetric'): FlatnessResult {
  const n = points.length;
  if (n < 3) throw new Error("Wymagane są minimum 3 punkty pomiarowe.");

  let bestPlane: { a: number, b: number, c: number } | null = null;
  let supportIndices: number[] = [];
  const EPSILON = 1e-6;

  if (method === 'least-squares') {
    let sumX = 0, sumY = 0, sumZ = 0, sumX2 = 0, sumY2 = 0, sumXY = 0, sumXZ = 0, sumYZ = 0;
    for (const p of points) {
      sumX += p.x; sumY += p.y; sumZ += p.z;
      sumX2 += p.x * p.x; sumY2 += p.y * p.y; sumXY += p.x * p.y;
      sumXZ += p.x * p.z; sumYZ += p.y * p.z;
    }

    const D = sumX2 * (sumY2 * n - sumY * sumY) - sumXY * (sumXY * n - sumX * sumY) + sumX * (sumXY * sumY - sumY2 * sumX);
    const Da = sumXZ * (sumY2 * n - sumY * sumY) - sumXY * (sumYZ * n - sumZ * sumY) + sumX * (sumYZ * sumY - sumY2 * sumZ);
    const Db = sumX2 * (sumYZ * n - sumZ * sumY) - sumXZ * (sumXY * n - sumX * sumY) + sumX * (sumXY * sumZ - sumYZ * sumX);
    const Dc = sumX2 * (sumY2 * sumZ - sumYZ * sumY) - sumXY * (sumXY * sumZ - sumYZ * sumX) + sumXZ * (sumXY * sumY - sumY2 * sumX);

    if (Math.abs(D) > 1e-10) {
      bestPlane = { a: Da / D, b: Db / D, c: Dc / D };
      supportIndices = [];
    }
  } else if (method === 'symmetric') {
    let bestScore = Infinity;
    const offset1 = Math.round(n / 3);
    const offset2 = Math.round((2 * n) / 3);

    for (let i = 0; i < n; i++) {
      const j = (i + offset1) % n;
      const k = (i + offset2) % n;

      const p1 = points[i];
      const p2 = points[j];
      const p3 = points[k];

      const v12 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
      const v13 = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z };

      const nx = v12.y * v13.z - v12.z * v13.y;
      const ny = v12.z * v13.x - v12.x * v13.z;
      const nz = v12.x * v13.y - v12.y * v13.x;

      if (Math.abs(nz) < 1e-10) continue;

      const a = -nx / nz;
      const b = -ny / nz;
      const c = p1.z - a * p1.x - b * p1.y;

      let maxAbsGap = 0;
      for (let m = 0; m < n; m++) {
        const pm = points[m];
        const expectedZ = a * pm.x + b * pm.y + c;
        const gap = expectedZ - pm.z;
        const absGap = Math.abs(gap);
        if (absGap > maxAbsGap) {
          maxAbsGap = absGap;
        }
      }

      if (maxAbsGap < bestScore) {
        bestScore = maxAbsGap;
        bestPlane = { a, b, c };
        supportIndices = [i, j, k];
      }
    }
  } else if (method === 'highest') {
    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 1; j < n - 1; j++) {
        for (let k = j + 1; k < n; k++) {
          const p1 = points[i];
          const p2 = points[j];
          const p3 = points[k];

          if (!isOriginInsideTriangle(p1, p2, p3)) continue;

          const v12 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
          const v13 = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z };

          const nx = v12.y * v13.z - v12.z * v13.y;
          const ny = v12.z * v13.x - v12.x * v13.z;
          const nz = v12.x * v13.y - v12.y * v13.x;

          if (Math.abs(nz) < 1e-10) continue;

          const a = -nx / nz;
          const b = -ny / nz;
          const c = p1.z - a * p1.x - b * p1.y;

          let isValid = true;
          for (let m = 0; m < n; m++) {
            const pm = points[m];
            const expectedZ = a * pm.x + b * pm.y + c;
            const gap = expectedZ - pm.z;

            // Punkty nie mogą wystawać (gap musi być <= 0, ewentualnie mała tolerancja)
            // Ujemny gap = punkt jest dalej (szczelina). 
            if (gap > EPSILON) {
              isValid = false;
              break;
            }
          }

          if (isValid) {
            bestPlane = { a, b, c };
            supportIndices = [i, j, k];
            break;
          }
        }
        if (bestPlane) break;
      }
      if (bestPlane) break;
    }

    // Fallback: jeśli wymóg trójkąta podparcia odrzucił wszystkie rozwiązania (bo kołnierz mocno przechylony fizycznie)
    // Znajdź po prostu 3 punkty, które obejmują wszystkie inne (bez patrzenia na trójkąt podparcia)
    if (!bestPlane) {
      for (let i = 0; i < n - 2; i++) {
        for (let j = i + 1; j < n - 1; j++) {
          for (let k = j + 1; k < n; k++) {
            const p1 = points[i];
            const p2 = points[j];
            const p3 = points[k];

            const v12 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
            const v13 = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z };

            const nx = v12.y * v13.z - v12.z * v13.y;
            const ny = v12.z * v13.x - v12.x * v13.z;
            const nz = v12.x * v13.y - v12.y * v13.x;

            if (Math.abs(nz) < 1e-10) continue;

            const a = -nx / nz;
            const b = -ny / nz;
            const c = p1.z - a * p1.x - b * p1.y;

            let isValid = true;
            for (let m = 0; m < n; m++) {
              const pm = points[m];
              const expectedZ = a * pm.x + b * pm.y + c;
              const gap = expectedZ - pm.z;
              if (gap > EPSILON) {
                isValid = false;
                break;
              }
            }
            if (isValid) {
              bestPlane = { a, b, c };
              supportIndices = [i, j, k];
              break;
            }
          }
          if (bestPlane) break;
        }
        if (bestPlane) break;
      }
    }
  }

  if (!bestPlane) {
    throw new Error("Algorytm nie znalazł odpowiedniej płaszczyzny bazowej. Sprawdź poprawność danych.");
  }

  let maxGap = -Infinity;
  let minGap = Infinity;

  const resultPoints = points.map(p => {
    const planeZ = bestPlane!.a * p.x + bestPlane!.b * p.y + bestPlane!.c;
    // Różnica miedzy płaszczyzną a odczytem
    // Ponieważ mniejszy odczyt Z oznacza punkt bliżej nas (wystający)
    // to jeśli planeZ > p.z, gap jest dodatni (punkt bliżej niż płaszczyzna)
    // jeśli planeZ < p.z, gap jest ujemny (szczelina)
    let gap = planeZ - p.z;

    if (Math.abs(gap) < EPSILON) gap = 0;

    if (gap > maxGap) maxGap = gap;
    if (gap < minGap) minGap = gap;

    return { ...p, gap };
  });

  if (maxGap === -Infinity) maxGap = 0;
  if (minGap === Infinity) minGap = 0;

  // Największe bezwzględne odchylenie (do skalowania wykresu)
  const absMaxDev = Math.max(Math.abs(maxGap), Math.abs(minGap));

  // Całkowity błąd płaskości to różnica między skrajnymi wychyleniami
  const totalError = maxGap - minGap;

  return {
    points: resultPoints,
    maxGap: absMaxDev,
    totalError,
    referencePlane: bestPlane,
    supportPoints: supportIndices.map(idx => points[idx].id)
  };
}

function isOriginInsideTriangle(p1: Point3D, p2: Point3D, p3: Point3D): boolean {
  const denominator = ((p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y));
  if (Math.abs(denominator) < 1e-10) return false;

  const w1 = ((p2.y - p3.y) * (0 - p3.x) + (p3.x - p2.x) * (0 - p3.y)) / denominator;
  const w2 = ((p3.y - p1.y) * (0 - p3.x) + (p1.x - p3.x) * (0 - p3.y)) / denominator;
  const w3 = 1 - w1 - w2;

  const EPSILON = 1e-6;
  return w1 >= -EPSILON && w2 >= -EPSILON && w3 >= -EPSILON;
}
