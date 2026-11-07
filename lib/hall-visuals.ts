// Reviewed against enlarged source artwork; never snap these contours to texture edges.
// The same silhouettes drive the light, cutout, pointer hit test and foreground mask.
export type Point = readonly [number, number];
type Shape = { outline: readonly Point[]; holes?: readonly (readonly Point[])[]; tilt: number };
export const ART_WIDTH = 2048;
export const ART_HEIGHT = ART_WIDTH / 3;
export const OBJECT_SHAPES: Record<string, Shape> = {
  exit: { tilt: 0, outline: [[31,218],[150,218],[150,459],[35,459],[31,447]] },
  invaders: { tilt: 0, outline: [[295,239],[401,239],[409,247],[409,281],[397,300],[409,370],[424,389],[424,412],[418,420],[418,494],[307,499],[265,480],[265,281],[287,248]] },
  chroma: { tilt: 0, outline: [[438,244],[538,244],[548,254],[553,269],[553,469],[533,488],[432,491],[417,481],[417,412],[411,391],[425,373],[435,301],[428,283],[428,270]] },
  bricks: { tilt: 0, outline: [[900,247],[990,247],[1000,252],[1005,280],[992,303],[1002,370],[1018,389],[1018,412],[1011,420],[1011,481],[912,486],[870,470],[870,280]] },
  plumber: { tilt: 0, outline: [[1022,239],[1109,239],[1117,248],[1125,270],[1125,290],[1116,303],[1128,366],[1144,384],[1146,410],[1138,419],[1138,483],[1011,483],[995,471],[995,270]] },
  snake: { tilt: 0, outline: [[1359,260],[1451,260],[1458,276],[1458,297],[1447,310],[1459,384],[1479,399],[1479,425],[1470,437],[1470,495],[1364,496],[1332,453],[1332,283]] },
  slots: { tilt: 0, outline: [[1476,247],[1585,247],[1585,290],[1573,303],[1585,380],[1606,398],[1606,425],[1595,437],[1595,492],[1497,492],[1439,481],[1439,284]] },
  counter: { tilt: 0, outline: [[1663,352],[2048,352],[2048,494],[1693,494],[1661,477],[1661,375],[1654,372],[1654,357]] },
  stool: { tilt: 0, outline: [[393,430],[415,426],[441,430],[449,434],[449,444],[438,448],[452,507],[444,509],[435,484],[425,484],[423,511],[414,511],[414,484],[400,484],[394,507],[387,506],[398,449],[391,445]], holes: [[[406,450],[416,450],[415,476],[401,476]],[[426,450],[431,450],[435,476],[425,476]]] },
  trash: { tilt: 0, outline: [[661,321],[682,321],[682,328],[692,330],[700,335],[700,344],[704,344],[704,351],[697,352],[696,408],[688,412],[645,412],[640,407],[640,352],[636,350],[636,338],[646,332],[661,329]] },
  snacks: { tilt: 0, outline: [[710,202],[870,202],[870,407],[828,413],[712,413],[710,405]] },
  boxes: { tilt: 0, outline: [[1740,448],[1798,448],[1798,470],[1817,470],[1822,477],[1822,502],[1782,508],[1779,504],[1752,509],[1723,506],[1723,459],[1737,455],[1737,452]] },
};

// These props are in front of the cabinets but behind the walking aisle.
// They must mask both the cabinet cutout AND its glow (including the tilted state).
export const CABINET_OCCLUDERS: Record<string, readonly (readonly Point[])[]> = {
  invaders: [OBJECT_SHAPES.stool.outline],
  chroma: [OBJECT_SHAPES.invaders.outline, OBJECT_SHAPES.stool.outline],
  bricks: [[[985,430],[1025,428],[1047,434],[1047,447],[1035,451],[1050,503],[1041,508],[1031,479],[1021,478],[1021,507],[1010,508],[1009,479],[995,480],[988,504],[979,503],[991,448],[984,445]]],
  plumber: [OBJECT_SHAPES.bricks.outline, [[1155,390],[1187,386],[1206,391],[1207,402],[1200,406],[1210,471],[1201,473],[1192,447],[1174,447],[1168,474],[1158,472],[1165,406],[1153,402]]],
  snake: [[[1320,445],[1352,446],[1361,451],[1387,451],[1387,505],[1352,518],[1320,510]]],
  slots: [OBJECT_SHAPES.snake.outline, [[1454,440],[1471,435],[1501,436],[1514,443],[1514,454],[1504,459],[1518,516],[1508,520],[1494,484],[1480,485],[1475,520],[1464,519],[1468,486],[1459,484],[1453,514],[1444,512],[1458,458]]],
  snacks: [[[809,365],[862,365],[862,376],[857,376],[857,409],[851,409],[851,419],[841,419],[841,411],[823,411],[823,419],[814,419],[814,407],[813,376],[809,376]]],
  counter: [OBJECT_SHAPES.boxes.outline],
};

// Separate masks preserve the open gaps between foreground silhouettes.
export const FOREGROUND_SHAPES: readonly (readonly Point[])[] = [
 [[0,439],[49,439],[49,446],[62,446],[62,454],[69,454],[69,465],[76,465],[76,474],[84,474],[84,476],[134,476],[134,482],[179,482],[179,489],[207,489],[207,495],[218,495],[218,501],[224,501],[224,541],[215,541],[215,549],[204,549],[204,558],[195,558],[195,566],[188,566],[188,578],[181,578],[181,591],[176,591],[176,607],[170,607],[170,621],[163,621],[163,639],[157,639],[157,660],[151,660],[151,683],[0,683]],
 [[218,549],[343,549],[343,558],[350,558],[350,577],[357,577],[357,602],[445,602],[445,608],[457,608],[457,620],[466,620],[466,635],[478,635],[478,663],[484,663],[484,683],[154,683],[154,669],[163,669],[163,655],[177,655],[177,647],[190,647],[190,639],[196,639],[196,619],[201,619],[201,579],[211,559]],
 [[1158,683],[1158,658],[1162,658],[1162,640],[1176,640],[1176,636],[1186,636],[1186,630],[1220,630],[1220,612],[1225,612],[1225,599],[1231,599],[1231,591],[1285,591],[1285,587],[1320,587],[1320,592],[1375,592],[1375,597],[1382,597],[1382,605],[1389,605],[1389,628],[1395,628],[1395,654],[1424,654],[1424,661],[1432,661],[1432,668],[1440,668],[1440,683]],
 [[2048,417],[1965,417],[1965,424],[1954,424],[1954,430],[1946,430],[1946,440],[1939,440],[1939,452],[1933,452],[1933,464],[1927,464],[1927,501],[1934,501],[1934,508],[1944,508],[1944,514],[1951,514],[1951,523],[1944,523],[1944,540],[1937,540],[1937,560],[1931,560],[1931,574],[1925,574],[1925,589],[1919,589],[1919,606],[1913,606],[1913,623],[1907,623],[1907,640],[1900,640],[1900,657],[1894,657],[1894,670],[1888,670],[1888,683],[2048,683]],
 [[1770,576],[1780,572],[1854,572],[1854,579],[1877,579],[1877,584],[1900,584],[1900,589],[1917,589],[1917,683],[1770,683]],
 [[1600,610],[1636,600],[1650,600],[1655,592],[1672,592],[1672,584],[1682,584],[1682,577],[1690,577],[1690,586],[1700,586],[1700,593],[1712,593],[1712,577],[1705,577],[1705,564],[1710,560],[1733,560],[1733,538],[1741,538],[1741,530],[1766,530],[1766,539],[1750,539],[1750,547],[1746,547],[1746,559],[1760,559],[1769,564],[1769,577],[1764,577],[1764,611],[1795,620],[1812,625],[1812,638],[1802,645],[1777,651],[1777,683],[1608,683],[1608,640],[1600,640]],
];

// The front aisle only; ceiling, walls, cabinets and silhouettes never act as floor.
export const FLOOR_SHAPE: readonly Point[] = [[0,478],[180,478],[180,512],[545,512],[545,539],[1320,539],[1320,520],[2048,520],[2048,683],[0,683]];
export function shapePath(points: readonly Point[]) { return 'M' + points.map(point => point.join(',')).join('L') + 'Z'; }
export function objectPath(id: string) {
  const shape = OBJECT_SHAPES[id];
  return shapePath(shape.outline) + (shape.holes || []).map(shapePath).join('');
}
export function containsPoint(points: readonly Point[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i], [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
export function foregroundAt(x: number, y: number) { return FOREGROUND_SHAPES.some(shape => containsPoint(shape, x, y)); }
export function objectAt(x: number, y: number): string | undefined {
  if (foregroundAt(x, y)) return;
  // Frontmost props take precedence over their cabinet/counter backgrounds.
  return Object.keys(OBJECT_SHAPES).reverse().find(id => {
    const shape = OBJECT_SHAPES[id];
    if (CABINET_OCCLUDERS[id]?.some(occluder => containsPoint(occluder, x, y))) return false;
    return containsPoint(shape.outline, x, y) && !shape.holes?.some(hole => containsPoint(hole, x, y));
  });
}
export function floorAt(x: number, y: number) {
  return containsPoint(FLOOR_SHAPE, x, y) && !foregroundAt(x, y) && !objectAt(x, y);
}

export interface LightStep { level: number; ms: number }
export function makeLightCycle(random: () => number = Math.random): LightStep[] {
  const between = (low: number, high: number) => low + random() * (high - low);
  const steps: LightStep[] = [{ level: 1, ms: between(1400, 4900) }];
  if (random() < .4) {
    // A lingering brownout, with a different recovery on each occurrence.
    steps.push({ level: between(.34, .48), ms: between(800, 1700) }, { level: between(.64, .78), ms: between(230, 570) });
  } else {
    const dips = random() < .55 ? 1 : 2;
    for (let i = 0; i < dips; i++) steps.push(
      { level: between(.38, .59), ms: between(140, 290) },
      { level: between(.75, .94), ms: between(380, 670) },
    );
    if (random() < .3) steps.push({ level: between(.48, .62), ms: between(450, 950) });
  }
  steps.push({ level: 1, ms: between(350, 1050) });
  return steps;
}
