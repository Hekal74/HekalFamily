import type { FamilyData, Language, Person } from "../../../types/family";

const NODE_W = 126;
const NODE_H = 52;
const LEAF_W = 96;
const LEAF_H = 44;
const SPOUSE_TOKEN = 30;
const SPOUSE_JOIN = 6;
const GAP_X = 8;
const GAP_Y = 96;
const SCENE_PADDING = 40;

export const STORAGE_KEY = "hekal_family_tree_data_v2";
export const LANGUAGE_KEY = "hekal_family_tree_lang_v1";

type TreeUnitType = "root" | "couple" | "single-parent" | "single";

interface TreeUnit {
  type: TreeUnitType;
  id: string;
  personId: string;
  partnerId: string | null;
  depth: number;
  children: TreeUnit[];
  width: number;
  ownWidth: number;
  mainW: number;
  x: number;
}

interface PositionedUnit extends TreeUnit {
  y: number;
}

interface UnitPosition {
  mainX: number;
  mainY: number;
  mainW: number;
  mainH: number;
  topX: number;
  topY: number;
  botX: number;
  botY: number;
  spouseX?: number;
  spouseY?: number;
  isRoot?: boolean;
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MarriageConnector {
  x: number;
  y: number;
  width: number;
}

export interface SceneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneNode {
  id: string;
  personId: string;
  kind: "person" | "spouse";
  x: number;
  y: number;
  width: number;
  height: number;
  isLeaf: boolean;
}

export interface TreeScene {
  width: number;
  height: number;
  lines: LineSegment[];
  connectors: MarriageConnector[];
  nodes: SceneNode[];
  boundsByPerson: Record<string, SceneBounds>;
  totalPeople: number;
  generations: number;
}

export interface SearchHit {
  id: string;
  primary: string;
  secondary: string;
  context: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getRootCouple = (data: FamilyData) =>
  data.couples.find(
    (couple) =>
      (couple.a === data.root[0] && couple.b === data.root[1]) ||
      (couple.a === data.root[1] && couple.b === data.root[0]),
  ) ?? data.couples.find((couple) => (couple.children?.length ?? 0) > 0);

const getDescendantCouple = (
  data: FamilyData,
  personId: string,
  rootCoupleId: string | undefined,
) =>
  data.couples.find(
    (couple) =>
      couple.id !== rootCoupleId &&
      (couple.a === personId || couple.b === personId),
  );

const buildUnit = (
  data: FamilyData,
  personId: string,
  depth: number,
  placed: Set<string>,
  rootCoupleId: string | undefined,
): TreeUnit | null => {
  if (placed.has(personId)) {
    return null;
  }

  const couple = getDescendantCouple(data, personId, rootCoupleId);
  const partnerId = couple
    ? couple.a === personId
      ? couple.b
      : couple.a
    : null;

  const unit: TreeUnit = {
    type: couple ? (partnerId ? "couple" : "single-parent") : "single",
    id: couple?.id ?? personId,
    personId,
    partnerId,
    depth,
    children: [],
    width: 0,
    ownWidth: 0,
    mainW: NODE_W,
    x: 0,
  };

  placed.add(personId);
  if (partnerId) {
    placed.add(partnerId);
  }

  for (const childId of couple?.children ?? []) {
    const childUnit = buildUnit(data, childId, depth + 1, placed, rootCoupleId);
    if (childUnit) {
      unit.children.push(childUnit);
    }
  }

  return unit;
};

const assignUnitWidths = (unit: TreeUnit): number => {
  const mainW = unit.children.length > 0 ? NODE_W : LEAF_W;
  let ownWidth = mainW;

  if (unit.type === "root") {
    ownWidth = NODE_W * 2 + GAP_X;
  } else if (unit.type === "couple") {
    ownWidth = mainW + SPOUSE_JOIN + SPOUSE_TOKEN;
  }

  unit.mainW = mainW;
  unit.ownWidth = ownWidth;

  if (unit.children.length === 0) {
    unit.width = ownWidth;
    return ownWidth;
  }

  const childrenWidth =
    unit.children.reduce((total, child) => total + assignUnitWidths(child), 0) +
    GAP_X * (unit.children.length - 1);

  unit.width = Math.max(ownWidth, childrenWidth);
  return unit.width;
};

const assignUnitX = (unit: TreeUnit, centerX: number) => {
  unit.x = centerX - unit.width / 2;

  if (unit.children.length === 0) {
    return;
  }

  const renderedChildrenWidth =
    unit.children.reduce((total, child) => total + child.width, 0) +
    GAP_X * (unit.children.length - 1);

  let cursor = unit.x + (unit.width - renderedChildrenWidth) / 2;

  for (const child of unit.children) {
    assignUnitX(child, cursor + child.width / 2);
    cursor += child.width + GAP_X;
  }
};

const flattenUnits = (unit: TreeUnit, out: PositionedUnit[]) => {
  out.push({
    ...unit,
    y: SCENE_PADDING + unit.depth * GAP_Y,
  });

  for (const child of unit.children) {
    flattenUnits(child, out);
  }
};

export const getPerson = (data: FamilyData, personId: string) =>
  data.people[personId];

export const getDisplayName = (
  person: Person | undefined,
  language: Language,
) => {
  if (!person) {
    return "—";
  }

  return language === "ar"
    ? person.ar || person.en || "—"
    : person.en || person.ar || "—";
};

export const getPersonInitials = (
  person: Person | undefined,
  language: Language,
) => {
  if (!person) {
    return "?";
  }

  if (language === "ar" && person.ar) {
    return person.ar.trim().slice(0, 1) || "?";
  }

  const source = (person.en || person.ar || "").trim();
  if (!source) {
    return "?";
  }

  const parts = source.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
};

export const getLifeLine = (person: Person | undefined, language: Language) => {
  if (!person) {
    return "";
  }

  const birth = person.birth?.trim();
  const death = person.death?.trim();

  if (birth && death) {
    return `${birth} - ${death}`;
  }

  if (birth) {
    return language === "ar" ? `مواليد ${birth}` : `b. ${birth}`;
  }

  if (death) {
    return language === "ar" ? `توفي ${death}` : `d. ${death}`;
  }

  return "";
};

export const getCouplesOf = (data: FamilyData, personId: string) =>
  data.couples.filter(
    (couple) => couple.a === personId || couple.b === personId,
  );

export const getParentsOf = (data: FamilyData, personId: string) => {
  const parentsCouple = data.couples.find((couple) =>
    (couple.children ?? []).includes(personId),
  );

  return parentsCouple
    ? ([parentsCouple.a, parentsCouple.b].filter(Boolean) as string[])
    : [];
};

export const getSpousesOf = (data: FamilyData, personId: string) =>
  getCouplesOf(data, personId)
    .map((couple) => (couple.a === personId ? couple.b : couple.a))
    .filter(Boolean) as string[];

export const getChildrenOf = (data: FamilyData, personId: string) =>
  getCouplesOf(data, personId).flatMap((couple) => couple.children ?? []);

export const isMarriedIn = (data: FamilyData, personId: string) => {
  const isChild = data.couples.some((couple) =>
    (couple.children ?? []).includes(personId),
  );

  if (isChild) {
    return false;
  }

  if (data.root.includes(personId)) {
    return false;
  }

  return data.couples.some(
    (couple) => couple.a === personId || couple.b === personId,
  );
};

export const searchPeople = (
  data: FamilyData,
  query: string,
  language: Language,
): SearchHit[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  return Object.entries(data.people)
    .filter(([, person]) => {
      const ar = person.ar?.toLowerCase() ?? "";
      const en = person.en?.toLowerCase() ?? "";
      return ar.includes(normalized) || en.includes(normalized);
    })
    .slice(0, 12)
    .map(([id, person]) => {
      const parentNames = getParentsOf(data, id).map((parentId) =>
        getDisplayName(getPerson(data, parentId), language),
      );
      const context = parentNames.length
        ? language === "ar"
          ? `ابن/بنت ${parentNames.join(" • ")}`
          : `child of ${parentNames.join(" • ")}`
        : "";

      return {
        id,
        primary: getDisplayName(person, language),
        secondary: language === "ar" ? (person.en ?? "") : (person.ar ?? ""),
        context,
      };
    });
};

export const isFamilyData = (value: unknown): value is FamilyData => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FamilyData>;

  return (
    Array.isArray(candidate.root) &&
    candidate.root.length === 2 &&
    !!candidate.people &&
    typeof candidate.people === "object" &&
    Array.isArray(candidate.couples)
  );
};

export const buildTreeScene = (data: FamilyData): TreeScene => {
  const rootCouple = getRootCouple(data);
  const placed = new Set<string>();
  const rootUnit: TreeUnit = {
    type: "root",
    id: rootCouple?.id ?? "root",
    personId: data.root[0],
    partnerId: data.root[1],
    depth: 0,
    children: [],
    width: 0,
    ownWidth: 0,
    mainW: NODE_W,
    x: 0,
  };

  placed.add(data.root[0]);
  placed.add(data.root[1]);

  for (const childId of rootCouple?.children ?? []) {
    const childUnit = buildUnit(data, childId, 1, placed, rootCouple?.id);
    if (childUnit) {
      rootUnit.children.push(childUnit);
    }
  }

  assignUnitWidths(rootUnit);
  assignUnitX(rootUnit, 0);

  const units: PositionedUnit[] = [];
  flattenUnits(rootUnit, units);

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;

  for (const unit of units) {
    minX = Math.min(minX, unit.x);
    maxX = Math.max(maxX, unit.x + unit.width);
  }

  const shift = Number.isFinite(minX) ? -minX + SCENE_PADDING : SCENE_PADDING;
  for (const unit of units) {
    unit.x += shift;
  }

  const unitPositions = new Map<string, UnitPosition>();

  for (const unit of units) {
    const unitCenterX = unit.x + unit.width / 2;
    const mainH = unit.children.length > 0 ? NODE_H : LEAF_H;

    if (unit.type === "root") {
      const pairWidth = NODE_W * 2 + GAP_X;
      const boxX = unitCenterX - pairWidth / 2;
      unitPositions.set(unit.id, {
        mainX: boxX,
        mainY: unit.y,
        mainW: NODE_W,
        mainH: NODE_H,
        topX: unitCenterX,
        topY: unit.y,
        botX: unitCenterX,
        botY: unit.y + NODE_H,
        isRoot: true,
      });
      continue;
    }

    if (unit.type === "couple") {
      const boxX = unitCenterX - unit.ownWidth / 2;
      const mainX = boxX;
      const mainCenterX = mainX + unit.mainW / 2;

      unitPositions.set(unit.id, {
        mainX,
        mainY: unit.y,
        mainW: unit.mainW,
        mainH,
        topX: mainCenterX,
        topY: unit.y,
        botX: mainCenterX,
        botY: unit.y + mainH,
        spouseX: boxX + unit.mainW + SPOUSE_JOIN,
        spouseY: unit.y + (mainH - SPOUSE_TOKEN) / 2,
      });
      continue;
    }

    unitPositions.set(unit.id, {
      mainX: unitCenterX - unit.mainW / 2,
      mainY: unit.y,
      mainW: unit.mainW,
      mainH,
      topX: unitCenterX,
      topY: unit.y,
      botX: unitCenterX,
      botY: unit.y + mainH,
    });
  }

  const lines: LineSegment[] = [];
  const nodes: SceneNode[] = [];
  const connectors: MarriageConnector[] = [];
  const boundsByPerson: Record<string, SceneBounds> = {};

  for (const unit of units) {
    if (unit.children.length === 0) {
      continue;
    }

    const parent = unitPositions.get(unit.id);
    if (!parent) {
      continue;
    }

    const busY = parent.botY + GAP_Y * 0.4;
    lines.push({
      x1: parent.botX,
      y1: parent.botY,
      x2: parent.botX,
      y2: busY,
    });

    const childXs = unit.children
      .map((child) => unitPositions.get(child.id)?.topX)
      .filter((value): value is number => typeof value === "number");

    if (childXs.length === 0) {
      continue;
    }

    lines.push({
      x1: Math.min(...childXs, parent.botX),
      y1: busY,
      x2: Math.max(...childXs, parent.botX),
      y2: busY,
    });

    for (const child of unit.children) {
      const childPosition = unitPositions.get(child.id);
      if (!childPosition) {
        continue;
      }

      lines.push({
        x1: childPosition.topX,
        y1: busY,
        x2: childPosition.topX,
        y2: childPosition.topY,
      });
    }
  }

  for (const unit of units) {
    const position = unitPositions.get(unit.id);
    if (!position) {
      continue;
    }

    if (unit.type === "root") {
      nodes.push({
        id: `${unit.personId}-node`,
        personId: unit.personId,
        kind: "person",
        x: position.mainX,
        y: position.mainY,
        width: NODE_W,
        height: NODE_H,
        isLeaf: false,
      });

      nodes.push({
        id: `${unit.partnerId}-node`,
        personId: unit.partnerId ?? "",
        kind: "person",
        x: position.mainX + NODE_W + GAP_X,
        y: position.mainY,
        width: NODE_W,
        height: NODE_H,
        isLeaf: false,
      });

      boundsByPerson[unit.personId] = {
        x: position.mainX,
        y: position.mainY,
        width: NODE_W,
        height: NODE_H,
      };

      if (unit.partnerId) {
        boundsByPerson[unit.partnerId] = {
          x: position.mainX + NODE_W + GAP_X,
          y: position.mainY,
          width: NODE_W,
          height: NODE_H,
        };
      }

      connectors.push({
        x: position.mainX + NODE_W,
        y: position.mainY + NODE_H / 2 - 1,
        width: GAP_X,
      });

      continue;
    }

    nodes.push({
      id: `${unit.personId}-node`,
      personId: unit.personId,
      kind: "person",
      x: position.mainX,
      y: position.mainY,
      width: position.mainW,
      height: position.mainH,
      isLeaf: position.mainW < NODE_W,
    });

    boundsByPerson[unit.personId] = {
      x: position.mainX,
      y: position.mainY,
      width: position.mainW,
      height: position.mainH,
    };

    if (
      unit.type === "couple" &&
      unit.partnerId &&
      position.spouseX !== undefined
    ) {
      nodes.push({
        id: `${unit.partnerId}-spouse`,
        personId: unit.partnerId,
        kind: "spouse",
        x: position.spouseX,
        y: position.spouseY ?? position.mainY,
        width: SPOUSE_TOKEN,
        height: SPOUSE_TOKEN,
        isLeaf: true,
      });

      boundsByPerson[unit.partnerId] = {
        x: position.spouseX,
        y: position.spouseY ?? position.mainY,
        width: SPOUSE_TOKEN,
        height: SPOUSE_TOKEN,
      };

      connectors.push({
        x: position.mainX + position.mainW,
        y: position.mainY + position.mainH / 2 - 1,
        width: SPOUSE_JOIN,
      });
    }
  }

  const maxBottom = nodes.reduce(
    (max, node) => Math.max(max, node.y + node.height),
    SCENE_PADDING + NODE_H,
  );

  return {
    width: clamp(maxX - minX + SCENE_PADDING * 2, NODE_W * 2, 12000),
    height: maxBottom + SCENE_PADDING,
    lines,
    connectors,
    nodes,
    boundsByPerson,
    totalPeople: Object.keys(data.people).length,
    generations: Math.max(...units.map((unit) => unit.depth)) + 1,
  };
};
