/**
 * Parcel-locker fit checker
 *
 * Determines whether cart items can be delivered via InPost or DPD parcel
 * lockers based on:
 *  1. Individual item dimensions & weight (any 3-D rotation allowed)
 *  2. Total packed volume with packing-factor & safety margin
 *  3. Total gross weight vs. locker max weight
 *
 * All intermediate values are printed to the browser console.
 */

// ---------------------------------------------------------------------------
// Locker specifications
// ---------------------------------------------------------------------------

export interface LockerSpec {
  name: string;
  /** Maximum dimensions in cm (order doesn't matter – we sort them). */
  dims: [number, number, number];
  /** Maximum gross weight in kg. */
  maxWeightKg: number;
}

/** InPost Paczkomat – max 41 × 38 × 64 cm, 25 kg */
export const INPOST_LOCKER: LockerSpec = {
  name: 'InPost Paczkomat',
  dims: [64, 41, 38],
  maxWeightKg: 25,
};

/** DPD Pickup – 59 × 44 × 50 cm, 20 kg */
export const DPD_LOCKER: LockerSpec = {
  name: 'DPD Pickup',
  dims: [59, 50, 44],
  maxWeightKg: 20,
};

// ---------------------------------------------------------------------------
// Tunable constants
// ---------------------------------------------------------------------------

/**
 * Packing inefficiency factor – items are rarely packed at 100% density.
 * 1.3 means we assume 30% more volume is needed than the bare item volumes.
 */
const PACKING_FACTOR = 1.3;

/**
 * Fraction of the locker's physical volume that we treat as usable.
 * 0.85 gives a ~15% safety margin (packaging material, air gaps).
 */
const LOCKER_SAFETY_FACTOR = 0.85;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns sorted [small, mid, large] copy of a 3-tuple. */
function sorted3(dims: [number, number, number]): [number, number, number] {
  return [...dims].sort((a, b) => a - b) as [number, number, number];
}

/**
 * Can the item [a,b,c] fit inside [L,W,H] in any rotation?
 *
 * The trick: sorting both ascending and comparing element-by-element
 * is equivalent to checking ALL 6 permutations.
 */
function fitsInAnyRotation(
  item: [number, number, number],
  locker: [number, number, number],
): boolean {
  const [i0, i1, i2] = sorted3(item);
  const [l0, l1, l2] = sorted3(locker);
  return i0 <= l0 && i1 <= l1 && i2 <= l2;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CartItemDims {
  articleId: string;
  /** cm */
  heightPacking: number | null | undefined;
  /** cm */
  widthPacking: number | null | undefined;
  /** cm */
  lengthPacking: number | null | undefined;
  /** kg */
  grossWeight: number | null | undefined;
  /** How many of this item are in the cart. */
  quantity: number;
}

export interface LockerFitResult {
  /** True when all checks pass (individual fit + volume + weight). */
  fits: boolean;
  /** Human-readable reason for failure, or "OK". */
  reason: string;
  details: {
    /** Items for which dimension data is missing (assumed to fit). */
    itemsMissingDims: string[];
    /** Per-item individual-fit results. */
    itemResults: Array<{
      articleId: string;
      hasDims: boolean;
      fitsIndividually: boolean;
      dims?: [number, number, number];
      weight?: number;
    }>;
    allFitIndividually: boolean;
    /** Total item volume (no packing factor), cm³. */
    totalRawVolumeCm3: number;
    /** After ×PACKING_FACTOR, cm³. */
    packedVolumeCm3: number;
    /** Locker volume × LOCKER_SAFETY_FACTOR, cm³. */
    effectiveLockerVolumeCm3: number;
    volumeOk: boolean;
    totalWeightKg: number;
    weightOk: boolean;
  };
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Checks whether the given cart items fit in the specified parcel locker.
 * Prints a detailed breakdown to the browser/Node console.
 */
export function checkParcelLockerFit(
  items: CartItemDims[],
  locker: LockerSpec,
): LockerFitResult {
  const lockerVolume = locker.dims[0] * locker.dims[1] * locker.dims[2];
  const effectiveLockerVolumeCm3 = lockerVolume * LOCKER_SAFETY_FACTOR;

  const itemsMissingDims: string[] = [];
  const itemResults: LockerFitResult['details']['itemResults'] = [];
  let totalRawVolumeCm3 = 0;
  let totalWeightKg = 0;
  let allFitIndividually = true;

  for (const item of items) {
    const hasDims =
      item.heightPacking != null &&
      item.widthPacking != null &&
      item.lengthPacking != null;

    if (!hasDims) {
      itemsMissingDims.push(item.articleId);
      // Missing dims → we optimistically assume it fits individually
      itemResults.push({ articleId: item.articleId, hasDims: false, fitsIndividually: true });
      // Can't add to volume if dims unknown
      continue;
    }

    const dims: [number, number, number] = [
      item.heightPacking as number,
      item.widthPacking as number,
      item.lengthPacking as number,
    ];
    const fitsIndividually = fitsInAnyRotation(dims, locker.dims);

    if (!fitsIndividually) allFitIndividually = false;

    const itemVolume = dims[0] * dims[1] * dims[2];
    totalRawVolumeCm3 += itemVolume * item.quantity;

    const weight = item.grossWeight ?? 0;
    totalWeightKg += weight * item.quantity;

    itemResults.push({ articleId: item.articleId, hasDims: true, fitsIndividually, dims, weight });
  }

  const packedVolumeCm3 = totalRawVolumeCm3 * PACKING_FACTOR;
  const volumeOk = packedVolumeCm3 <= effectiveLockerVolumeCm3;
  const weightOk = totalWeightKg <= locker.maxWeightKg;

  // ---------------------------------------------------------------------------
  // Console output
  // ---------------------------------------------------------------------------
  console.group(`📦 Parcel-locker fit check: ${locker.name}`);
  console.log('Locker dims (cm):', locker.dims.join(' × '));
  console.log('Locker physical volume (cm³):', lockerVolume.toFixed(0));
  console.log(`Effective locker volume (×${LOCKER_SAFETY_FACTOR} safety, cm³):`, effectiveLockerVolumeCm3.toFixed(0));
  console.log('Max weight (kg):', locker.maxWeightKg);
  console.log('');

  console.group('Per-item individual fit:');
  for (const r of itemResults) {
    if (!r.hasDims) {
      console.warn(`  ⚠️  ${r.articleId}: dimensions missing – assumed OK`);
    } else {
      const icon = r.fitsIndividually ? '✅' : '❌';
      console.log(`  ${icon} ${r.articleId}: dims [${r.dims!.join(' × ')}] cm, weight ${r.weight} kg → ${r.fitsIndividually ? 'fits' : 'DOES NOT FIT'}`);
    }
  }
  console.groupEnd();

  console.log('');
  console.log('Total raw item volume (cm³):', totalRawVolumeCm3.toFixed(0));
  console.log(`Packed volume (×${PACKING_FACTOR} packing factor, cm³):`, packedVolumeCm3.toFixed(0));
  console.log('Volume check:', volumeOk ? `✅ OK (${packedVolumeCm3.toFixed(0)} ≤ ${effectiveLockerVolumeCm3.toFixed(0)})` : `❌ EXCEEDS (${packedVolumeCm3.toFixed(0)} > ${effectiveLockerVolumeCm3.toFixed(0)})`);
  console.log('');
  console.log('Total gross weight (kg):', totalWeightKg.toFixed(2));
  console.log('Weight check:', weightOk ? `✅ OK (${totalWeightKg.toFixed(2)} ≤ ${locker.maxWeightKg} kg)` : `❌ EXCEEDS (${totalWeightKg.toFixed(2)} > ${locker.maxWeightKg} kg)`);

  // Determine overall result
  let fits = true;
  let reason = 'OK';

  if (!allFitIndividually) {
    fits = false;
    reason = 'One or more items are too large to fit individually';
  } else if (!volumeOk) {
    fits = false;
    reason = `Total packed volume (${packedVolumeCm3.toFixed(0)} cm³) exceeds effective locker volume (${effectiveLockerVolumeCm3.toFixed(0)} cm³)`;
  } else if (!weightOk) {
    fits = false;
    reason = `Total weight (${totalWeightKg.toFixed(2)} kg) exceeds locker limit (${locker.maxWeightKg} kg)`;
  }

  console.log('');
  console.log('Result:', fits ? '✅ FITS' : `❌ DOES NOT FIT – ${reason}`);
  if (itemsMissingDims.length > 0) {
    console.warn('⚠️  Items with missing dimensions (optimistically allowed):', itemsMissingDims.join(', '));
  }
  console.groupEnd();

  return {
    fits,
    reason,
    details: {
      itemsMissingDims,
      itemResults,
      allFitIndividually,
      totalRawVolumeCm3,
      packedVolumeCm3,
      effectiveLockerVolumeCm3,
      volumeOk,
      totalWeightKg,
      weightOk,
    },
  };
}

/**
 * Convenience wrapper: check both InPost and DPD lockers at once.
 */
export function checkAllLockers(items: CartItemDims[]): {
  inpost: LockerFitResult;
  dpd: LockerFitResult;
} {
  return {
    inpost: checkParcelLockerFit(items, INPOST_LOCKER),
    dpd: checkParcelLockerFit(items, DPD_LOCKER),
  };
}
