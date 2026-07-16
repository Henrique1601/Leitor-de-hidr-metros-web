import { Building, Bloco, Andar, BuildingState } from './building';

interface UnitDef {
  apt: string;
  metroCount: number;
}

const FLOOR_5: UnitDef[] = [
  { apt: '501', metroCount: 2 },
  { apt: '502', metroCount: 2 },
  { apt: '503', metroCount: 2 },
  { apt: '504', metroCount: 2 },
  { apt: '505', metroCount: 2 },
  { apt: '506', metroCount: 1 },
  { apt: '507', metroCount: 1 },
  { apt: '508', metroCount: 2 },
  { apt: '509', metroCount: 2 },
  { apt: '510', metroCount: 2 },
  { apt: '511', metroCount: 1 },
  { apt: '512', metroCount: 2 },
  { apt: '513', metroCount: 2 },
  { apt: '514', metroCount: 1 },
  { apt: '515', metroCount: 2 },
  { apt: '516', metroCount: 2 },
  { apt: '517', metroCount: 2 },
  { apt: '518', metroCount: 1 },
  { apt: '519', metroCount: 1 },
  { apt: '520', metroCount: 2 },
  { apt: '521', metroCount: 2 },
];

const FLOOR_6: UnitDef[] = [
  { apt: '601', metroCount: 2 },
  { apt: '602', metroCount: 2 },
  { apt: '603', metroCount: 1 },
  { apt: '604', metroCount: 1 },
  { apt: '605', metroCount: 1 },
  { apt: '606', metroCount: 1 },
  { apt: '607', metroCount: 1 },
  { apt: '608', metroCount: 1 },
  { apt: '609', metroCount: 2 },
  { apt: '610', metroCount: 2 },
  { apt: '611', metroCount: 2 },
  { apt: '612', metroCount: 2 },
  { apt: '613', metroCount: 2 },
  { apt: '614', metroCount: 2 },
  { apt: '615', metroCount: 2 },
  { apt: '616', metroCount: 2 },
  { apt: '617', metroCount: 2 },
  { apt: '618', metroCount: 2 },
  { apt: '619', metroCount: 2 },
  { apt: '620', metroCount: 2 },
  { apt: '621', metroCount: 2 },
  { apt: '622', metroCount: 2 },
  { apt: '623', metroCount: 2 },
];

const FLOOR_7: UnitDef[] = [
  { apt: '701', metroCount: 2 },
  { apt: '702', metroCount: 2 },
  { apt: '703', metroCount: 1 },
  { apt: '704', metroCount: 1 },
  { apt: '705', metroCount: 1 },
  { apt: '706', metroCount: 1 },
  { apt: '707', metroCount: 1 },
  { apt: '708', metroCount: 1 },
  { apt: '709', metroCount: 2 },
  { apt: '710', metroCount: 2 },
  { apt: '711', metroCount: 2 },
  { apt: '712', metroCount: 2 },
  { apt: '713', metroCount: 2 },
  { apt: '714', metroCount: 2 },
  { apt: '715', metroCount: 1 },
  { apt: '716', metroCount: 1 },
  { apt: '717', metroCount: 1 },
  { apt: '718', metroCount: 1 },
  { apt: '719', metroCount: 2 },
  { apt: '720', metroCount: 2 },
  { apt: '721', metroCount: 2 },
  { apt: '722', metroCount: 2 },
  { apt: '723', metroCount: 1 },
];

const FLOOR_8: UnitDef[] = [
  { apt: '801', metroCount: 2 },
  { apt: '802', metroCount: 2 },
  { apt: '803', metroCount: 1 },
  { apt: '804', metroCount: 1 },
  { apt: '805', metroCount: 1 },
  { apt: '806', metroCount: 1 },
  { apt: '807', metroCount: 1 },
  { apt: '808', metroCount: 1 },
  { apt: '809', metroCount: 2 },
  { apt: '810', metroCount: 2 },
  { apt: '811', metroCount: 2 },
  { apt: '812', metroCount: 2 },
  { apt: '813', metroCount: 2 },
  { apt: '814', metroCount: 2 },
  { apt: '815', metroCount: 2 },
  { apt: '816', metroCount: 2 },
  { apt: '817', metroCount: 2 },
  { apt: '818', metroCount: 2 },
  { apt: '819', metroCount: 2 },
  { apt: '820', metroCount: 2 },
  { apt: '821', metroCount: 2 },
  { apt: '822', metroCount: 2 },
  { apt: '823', metroCount: 2 },
];

const FLOOR_9: UnitDef[] = [
  { apt: '901', metroCount: 2 },
  { apt: '902', metroCount: 2 },
  { apt: '903', metroCount: 1 },
  { apt: '904', metroCount: 1 },
  { apt: '905', metroCount: 1 },
  { apt: '906', metroCount: 1 },
  { apt: '907', metroCount: 1 },
  { apt: '908', metroCount: 1 },
  { apt: '909', metroCount: 2 },
  { apt: '910', metroCount: 2 },
  { apt: '911', metroCount: 2 },
  { apt: '912', metroCount: 2 },
  { apt: '913', metroCount: 2 },
  { apt: '914', metroCount: 2 },
  { apt: '915', metroCount: 2 },
  { apt: '916', metroCount: 2 },
  { apt: '917', metroCount: 2 },
  { apt: '918', metroCount: 2 },
  { apt: '919', metroCount: 2 },
  { apt: '920', metroCount: 2 },
  { apt: '921', metroCount: 2 },
  { apt: '922', metroCount: 2 },
  { apt: '923', metroCount: 2 },
];

const FLOOR_10: UnitDef[] = [
  { apt: '1001', metroCount: 2 },
  { apt: '1002', metroCount: 2 },
  { apt: '1003', metroCount: 1 },
  { apt: '1004', metroCount: 1 },
  { apt: '1005', metroCount: 1 },
  { apt: '1006', metroCount: 1 },
  { apt: '1007', metroCount: 1 },
  { apt: '1008', metroCount: 1 },
  { apt: '1009', metroCount: 2 },
  { apt: '1010', metroCount: 2 },
  { apt: '1011', metroCount: 2 },
  { apt: '1012', metroCount: 2 },
  { apt: '1013', metroCount: 2 },
  { apt: '1014', metroCount: 2 },
  { apt: '1015', metroCount: 2 },
  { apt: '1016', metroCount: 2 },
  { apt: '1017', metroCount: 2 },
  { apt: '1018', metroCount: 2 },
  { apt: '1019', metroCount: 2 },
  { apt: '1020', metroCount: 2 },
  { apt: '1021', metroCount: 2 },
  { apt: '1022', metroCount: 2 },
  { apt: '1023', metroCount: 1 },
];

function makeAndar(numero: number, units: UnitDef[]): Andar {
  return {
    numero,
    apts: units.map((u) => u.apt),
    metroCounts: Object.fromEntries(units.map((u) => [u.apt, u.metroCount])),
  };
}

function makeBloco(nome: string, floors: Array<{ numero: number; units: UnitDef[] }>): Bloco {
  return {
    id: crypto.randomUUID(),
    nome,
    andares: floors.map((f) => makeAndar(f.numero, f.units)),
  };
}

export function createLuxorBuilding(): Building {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    nome: 'Luxor e Lutecia',
    blocos: [
      makeBloco('Luxor', [
        { numero: 5, units: FLOOR_5 },
        { numero: 6, units: FLOOR_6 },
        { numero: 7, units: FLOOR_7 },
        { numero: 8, units: FLOOR_8 },
        { numero: 9, units: FLOOR_9 },
        { numero: 10, units: FLOOR_10 },
      ]),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function seedLuxor(): BuildingState {
  const building = createLuxorBuilding();
  const state: BuildingState = {
    buildings: [building],
    activeBuildingId: building.id,
  };
  return state;
}
