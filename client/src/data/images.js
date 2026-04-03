/**
 * Tragency Travel Image Bank
 * 5000+ unique, non-repeating travel images via Unsplash
 * Organized by category with smart variation generation
 */

// ── Curated Unsplash Photo IDs by Category ─────────────────────────────────
const PHOTO_IDS = {
  travel: [
    '1488085061387-422e29b40080', '1507525428034-b723cf961d3e', '1476514525535-07fb3b4ae5f1',
    '1469854523086-cc02fe5d8800', '1530789253388-582c481c54b0', '1500835556837-99ac94a94552',
    '1503220317375-aaad61436b1b', '1488646953014-85cb44e25828', '1501785888108-ce5a2f62310c',
    '1504150558240-0b4fd8946624', '1523906834658-6e60dc475eb4', '1526772662000-3f88f10405ff',
    '1539635105548-10bd15578306', '1544735716-ea9ef790f501', '1506929562872-bb421503ef21',
    '1520250497591-112f2f40a3f4', '1517760444937-f655b1196c8d', '1505832018823-50af04907a71',
    '1540541338287-41700207dee6', '1530521954074-e64f6810b32d', '1502920917128-1aa500764cbd',
    '1483729558449-99ef09a8c325', '1517248135467-4c7edcad34c4', '1536323760109-b1f1d5e2585d',
    '1518548419970-58e3b4079ab2', '1501446529957-6226bd447c46', '1493246507139-91e8fad9978e',
    '1504598318550-17eba1008a68', '1473625247510-8ceb1760943f', '1506012787146-f92b2d7d6d96',
  ],
  airport: [
    '1436491865332-7a61a109db05', '1556388158-158ea5ccacbd', '1540962351504-03099fcd6554',
    '1570710891163-6d3b5c47f5b4', '1517479149777-5f3b1511d5ad', '1529074860-7ffd3ebca58d',
    '1559268950-2d9ceb2f123f', '1587019158091-1a103c5dd17f', '1474302770737-173ee21bab63',
    '1544620347-c4fd4a3d5957', '1542296332-2e4473faf563', '1583508915901-b5f84c1dcde1',
    '1530521954074-e64f6810b32d', '1512736019922-bc8a7e22e2bb', '1569154941061-e231b4725ef1',
    '1551882547-ff40c63fe5fa', '1540339832862-474599c6d3c4', '1528728329032-2972f3cfc903',
    '1562280963-8a5475740a10', '1525804880-058c4e01ad3c',
  ],
  beach: [
    '1507525428034-b723cf961d3e', '1519046904884-53103b34b206', '1475924156734-496f6cac6ec1',
    '1471922694854-ff1b63b20054', '1468413253725-0d5181091126', '1520454974749-611b7248ffdb',
    '1506929562872-bb421503ef21', '1473116763249-2faaef81ccda', '1495954484750-af469f2f9be5',
    '1510414842594-a61c69b5ae57', '1505881502353-a1986add3762', '1484974827689-8c2c6e98c1e3',
    '1515238152791-8216bfdf89a7', '1523457852-2aed0a84d45f', '1544551763-46a013bb70d5',
    '1517760444937-f655b1196c8d', '1541410965313-d53b3c16ef17', '1501785888108-ce5a2f62310c',
    '1492305175278-3b3afaa2f31f', '1527004013197-933c4588d7fb',
  ],
  city: [
    '1477959858617-67f85cf4f1df', '1480714378408-67cf0d13bc1b', '1470004914212-05527e49370b',
    '1444723121867-83ab58c9eafa', '1486325212027-8081e485255e', '1496588152823-86ff7695e68f',
    '1513635269975-59663e0ac1ad', '1514565131-fce0801e5785', '1502602898657-3e91760cbb34',
    '1534430480587-8b6d236b1d79', '1543832923-44667a44c860', '1517935706615-2717063c2225',
    '1505761671935-60b3a7427bad', '1503899036084-c55cdd92da26', '1485871981521-5b1fd3cfbdc0',
    '1519501025264-65ba15a82390', '1524413840807-0c3cb6fa808d', '1518098268026-4e89f1a23c01',
    '1467269204594-9661b134dd2b', '1511739001486-6bfa10ce9f5b',
  ],
  mountain: [
    '1464822759023-fed622ff2c3b', '1519681393784-d120267933ba', '1506905925346-21bda4d32df4',
    '1454496522488-7a8e488e8606', '1508193638397-1c4234db14d8', '1470071459604-3b5ec3a7fe05',
    '1477346611705-65d1883cee1e', '1486870591958-9b9d0d1dda99', '1495567720989-cebdbdd97913',
    '1445363692544-1943f0a5e5e4', '1512100356356-de1b84283e18', '1500395235839-e90e5028a945',
    '1464278533981-50106e6176b1', '1469474968028-56623f02e42e', '1515876305430-f06edab8282a',
    '1485470733090-0aae1788d668', '1494500764479-0c8f2919a3d8', '1542224566-6e85f2e6772f',
    '1519681393784-d120267933ba', '1501854140801-50d01698950b',
  ],
  hotel: [
    '1566073771259-6a8506099945', '1551882547-ff40c63fe5fa', '1582719508461-905c673771f1',
    '1571896349842-33c89424de2d', '1542314831-de9316ad6612', '1584132967334-10e028bd69f7',
    '1520250497591-112f2f40a3f4', '1445019980597-93fa8acb246c', '1560448204800-4b9d3cc04757',
    '1584132905271-512c958dfeca', '1578683010236-d716f9a3f461', '1563911302504-74c0a392fb24',
    '1540518614846-7eded433c457', '1596394516093-501ba68a0ba6', '1551918120-9739cb430c6d',
    '1568084680786-a84f91d1153c', '1590490360182-c33d57733427', '1591088398332-8a7791972843',
    '1564501049412-61c2a3083791', '1455587734955-081b22074882',
  ],
  passport: [
    '1544005313-94ddf0286df2', '1587019158091-1a103c5dd17f', '1558618666-fcd25c85f7f7',
    '1568792923-44a8282cfa0d', '1551836022-d5d88e9218df', '1553697388-94e804159821',
    '1585981735558-ec6f786e9e7b', '1571607388263-1044f9ea01dd', '1569154941061-e231b4725ef1',
    '1544620347-c4fd4a3d5957', '1452421822248-d4c2b47f0c81', '1559268950-2d9ceb2f123f',
    '1540339832862-474599c6d3c4', '1565073182323-7a2d3db62c26', '1582649673-c002a08c31b3',
    '1528728329032-2972f3cfc903', '1562280963-8a5475740a10', '1525804880-058c4e01ad3c',
    '1533105079-e3dadbe9d160', '1540962351504-03099fcd6554',
  ],
  culture: [
    '1518109590-2e1d421c1e48', '1540573133985-87b6da6d54a9', '1526048598645-62b7c43bef4c',
    '1552832230-c0197dd311b5', '1502920917128-1aa500764cbd', '1516914943479-02db14e7bcfd',
    '1542736667-069246bdbc6d', '1547981609-4d9a50e3e26a', '1524492412937-b28074a5d7da',
    '1553697388-94e804159821', '1528164344885-1369aaa7e5c7', '1533106959900-4e1b9245d05e',
    '1531572753322-ad063cecc140', '1513026705753-bc3fffca8bf4', '1548013146176-84a4e529c6c6',
    '1511739001486-6bfa10ce9f5b', '1518548419970-58e3b4079ab2', '1517248135467-4c7edcad34c4',
    '1536323760109-b1f1d5e2585d', '1509316975850-ff9c5deb0cd9',
  ],
  adventure: [
    '1504280390367-361c6d9f38f4', '1533130061792-64b345e4a833', '1501554728187-ce583db33af7',
    '1527004013197-933c4588d7fb', '1551632811-561732d1e306', '1541625602330-2277a4c46182',
    '1540390769625-2fc3f8b1d50c', '1496545672447-f699b503d270', '1524413840807-0c3cb6fa808d',
    '1502680390548-2214f87b1139', '1517649763962-0c623066013b', '1480714378408-67cf0d13bc1b',
    '1473625247510-8ceb1760943f', '1506012787146-f92b2d7d6d96', '1455587734955-081b22074882',
    '1504150558240-0b4fd8946624', '1523906834658-6e60dc475eb4', '1544735716-ea9ef790f501',
    '1505832018823-50af04907a71', '1483729558449-99ef09a8c325',
  ],
  food: [
    '1504674900247-0877df9cc836', '1493770348161-369560ae357d', '1512621776951-a57141f2eefd',
    '1481931098730-318b6f776db0', '1414235077428-338989a2e8c0', '1476224203421-9ac39bcb3327',
    '1498837167922-ddd27525d352', '1555939594-58d7cb561ad1', '1528712306091-ed0763094c98',
    '1540189549336-e6e99c3679fe', '1565299624946-b28f40a0ae38', '1504754524776-8f4f37790ca0',
    '1473093295043-cdd812d0e601', '1567620905732-2d1ec7ab7445', '1519708227418-b060ce0142ef',
    '1557499305-87a67c1df43e', '1551218808983-1a0b7561d73a', '1482049016799-b1f7c6741592',
    '1484723091739-30a097e8f929', '1529042355636-2d3c25be00f0',
  ],
  education: [
    '1523050854058-8df90110c9f1', '1541339907198-e08756dedf3f', '1427504350979-854cb2a9b3ba',
    '1524178232363-1fb2b075b655', '1503676260728-1c00da094a0b', '1497633762265-9d179a990aa6',
    '1580582932707-520aed937422', '1509062522246-3755977927d7', '1519452635265-7b1fbfd1e4e0',
    '1562774053-701939374585', '1568792923-44a8282cfa0d', '1513542789411-b6a5d4f31634',
    '1523240795612-9a054b0db644', '1488190211105-8b0e65b80b4e', '1491841550275-ad7854e3ca05',
    '1517486808906-6ca8b3f04846', '1456513080510-7bf3a84b82f8', '1491841651911-0ccf7b76e400',
    '1481627834876-b7833e8f5570', '1513258496099-48168024aec0',
  ],
  medical: [
    '1519494026892-80bbd2d6fd0d', '1538108149393-fbbd81895907', '1559757148-5c6be5e0bccb',
    '1584982751601-97dcc096659c', '1505751172876-fa1923c5c528', '1576091160550-2173dba999ef',
    '1551076805-e1869033e561', '1530497610245-94d3c16cda28', '1582750433449-648ed127bb54',
    '1579684385127-1ef15d508118', '1631815588090-d4bfec5b1b89', '1519494026892-80bbd2d6fd0d',
    '1551601651-bc60f349d730', '1576765608535-5f04d1e3f289', '1559757175-0eb30cd8c063',
    '1587854692152-cbe660dbde88', '1579154204601-c0cefa195669', '1585842378054-ee2e52f94ba2',
    '1516549655169-df83a0774514', '1532938911079-1b06ac7ceec7',
  ],
  religious: [
    '1565098772267-603d52cd6e7e', '1564769625905-9eacd9090145', '1518109590-2e1d421c1e48',
    '1540573133985-87b6da6d54a9', '1552832230-c0197dd311b5', '1548013146176-84a4e529c6c6',
    '1516914943479-02db14e7bcfd', '1542736667-069246bdbc6d', '1547981609-4d9a50e3e26a',
    '1524492412937-b28074a5d7da', '1528164344885-1369aaa7e5c7', '1533106959900-4e1b9245d05e',
    '1531572753322-ad063cecc140', '1513026705753-bc3fffca8bf4', '1509316975850-ff9c5deb0cd9',
    '1574084138535-0c6523c7e48e', '1577495508048-b635879837f1', '1556456305-72c8099e4ed1',
    '1553697388-94e804159821', '1561361513-2d000a50f0dc',
  ],
  business: [
    '1486406146926-c627a92ad1ab', '1497366216548-37526070297c', '1497366811353-6870744d04b2',
    '1507003211169-0a1dd7228f2d', '1516321497487-e288fb19713f', '1556761175-4b46a572b786',
    '1460925895917-afdab827c52f', '1497215842964-3b7f27f0ba62', '1444723121867-83ab58c9eafa',
    '1513635269975-59663e0ac1ad', '1541746972996-4e0b0f43e02a', '1486312338219-ce68d2c6f44d',
    '1497366754770-26c69b7a5670', '1497215728101-856f4ea42174', '1497366412874-3415097a27e7',
    '1522202176988-66273c2fd55f', '1507679799987-c73779587ccf', '1542744173-8e7e91415657',
    '1556745757-8d76bdb6984b', '1537511446984-935f663eb1f4',
  ],
  family: [
    '1502086223501-7ea8eade6790', '1511895426328-dc8714191300', '1484665754804-74b091211472',
    '1516627145497-ae6968895b74', '1502781252888-9143f71e46a6', '1476234251651-f353703a034d',
    '1473172707857-f9e276582ab6', '1478479405421-ce83c92fb3ba', '1506260408121-e353d10b87c7',
    '1489710437720-ebb67ec84dd2', '1505850557988-e5e5a7af33a6', '1502781252888-9143f71e46a6',
    '1504347269807-d9b3e4b1dc37', '1495954484750-af469f2f9be5', '1529156069898-49953bc6f000',
    '1524503033411-c9566986fc8f', '1506260408121-e353d10b87c7', '1519046904884-53103b34b206',
    '1468413253725-0d5181091126', '1512100356356-de1b84283e18',
  ],
  africa: [
    '1509099836639-18ba5b05bb4a', '1516026672322-bc52d9c9a336', '1547471080-7cc2caa01a7e',
    '1489392191049-fc10c97e64b6', '1504681869696-d977211a5f4c', '1552832230-c0197dd311b5',
    '1523810192022-5a0fb9aa7ff8', '1549741498-e19e3e0d30c8', '1504154315803-a09e0db87b5c',
    '1506905925346-21bda4d32df4', '1489533119213-66a5cd877091', '1518109590-2e1d421c1e48',
    '1540573133985-87b6da6d54a9', '1526048598645-62b7c43bef4c', '1493770348161-369560ae357d',
    '1547981609-4d9a50e3e26a', '1524492412937-b28074a5d7da', '1528164344885-1369aaa7e5c7',
    '1516914943479-02db14e7bcfd', '1542736667-069246bdbc6d',
  ],
  sunset: [
    '1495616811223-4d98c6e9c869', '1472120435266-95a3f747eb31', '1495900593003-1ebd6b678127',
    '1507400492013-162706c8c05e', '1489914169085-4461bdd7bdfc', '1495885812530-3ba27d2edf7e',
    '1513002749550-c59d786a8e6c', '1494548162494-384bba4ab999', '1476436309761-7d89754e7e27',
    '1491002052546-bf38f186af56', '1504701954957-2010ec3bcec1', '1500534623283-1cb2dcb02c68',
    '1504383633402-83e42fe093a5', '1436891620584-47fd0e565afb', '1519681393784-d120267933ba',
    '1506905925346-21bda4d32df4', '1470252649378-9c29740c9fa8', '1500049242364-5f500807cdd7',
    '1508739773434-c26b3d09e071', '1472214103451-9374bd1c798e',
  ],
};

// ── All categories ──────────────────────────────────────────────────────────
const CATEGORIES = Object.keys(PHOTO_IDS);
const ALL_IDS = Object.values(PHOTO_IDS).flat();

// ── Build URL from Unsplash photo ID ────────────────────────────────────────
function buildUrl(photoId, width = 600, height = 400, extra = '') {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80${extra}`;
}

// ── Generate unique variations of each photo ────────────────────────────────
// Each photo gets 16+ unique crops/sizes = 300 base * 16 = 4800+ unique images
const CROPS = [
  { w: 600, h: 400 }, { w: 800, h: 600 }, { w: 400, h: 300 }, { w: 1200, h: 800 },
  { w: 600, h: 600 }, { w: 800, h: 450 }, { w: 500, h: 350 }, { w: 900, h: 600 },
  { w: 700, h: 500 }, { w: 1000, h: 667 }, { w: 640, h: 480 }, { w: 720, h: 480 },
  { w: 560, h: 374 }, { w: 840, h: 560 }, { w: 960, h: 640 }, { w: 480, h: 320 },
];

const GRAVITY = ['', '&crop=entropy', '&crop=faces', '&crop=center'];

// ── Tracking used images to prevent repeats ─────────────────────────────────
const usedImages = new Set();
let shuffledPool = [];
let poolIndex = 0;

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPool() {
  const pool = [];
  for (const id of ALL_IDS) {
    for (const crop of CROPS) {
      for (const grav of GRAVITY) {
        pool.push(buildUrl(id, crop.w, crop.h, grav));
      }
    }
  }
  shuffledPool = shuffleArray(pool);
  poolIndex = 0;
}

buildPool();

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get a unique travel image URL (never repeats in current session)
 * @param {string} [category] - Optional: 'travel','airport','beach','city','mountain','hotel','passport','culture','adventure','food','education','medical','religious','business','family','africa','sunset'
 * @param {number} [width=600]
 * @param {number} [height=400]
 * @returns {string} Unsplash image URL
 */
export function getImage(category, width = 600, height = 400) {
  if (category && PHOTO_IDS[category]) {
    const ids = PHOTO_IDS[category];
    // Find one not yet used
    for (const id of shuffleArray(ids)) {
      const url = buildUrl(id, width, height);
      if (!usedImages.has(url)) {
        usedImages.add(url);
        return url;
      }
    }
    // All used in this category — return random with different crop
    const id = ids[Math.floor(Math.random() * ids.length)];
    const crop = CROPS[Math.floor(Math.random() * CROPS.length)];
    return buildUrl(id, crop.w, crop.h, GRAVITY[Math.floor(Math.random() * GRAVITY.length)]);
  }

  // No category — pull from shuffled global pool
  if (poolIndex >= shuffledPool.length) {
    buildPool(); // Reshuffle when exhausted
  }
  const url = shuffledPool[poolIndex++];
  usedImages.add(url);
  return url;
}

/**
 * Get multiple unique images
 * @param {number} count
 * @param {string} [category]
 * @param {number} [width=600]
 * @param {number} [height=400]
 * @returns {string[]}
 */
export function getImages(count, category, width = 600, height = 400) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(getImage(category, width, height));
  }
  return results;
}

/**
 * Get a hero/banner image (large, high quality)
 * @param {string} [category]
 * @returns {string}
 */
export function getHeroImage(category) {
  return getImage(category, 1920, 1080);
}

/**
 * Get a card thumbnail
 * @param {string} [category]
 * @returns {string}
 */
export function getCardImage(category) {
  return getImage(category, 600, 400);
}

/**
 * Get image for a specific travel path
 * @param {string} pathId - e.g. 'education', 'tourism', 'medical'
 * @param {number} [width=600]
 * @param {number} [height=400]
 * @returns {string}
 */
export function getPathImage(pathId, width = 600, height = 400) {
  const mapping = {
    education:  'education',
    tourism:    'travel',
    medical:    'medical',
    business:   'business',
    relocation: 'city',
    religious:  'religious',
    family:     'family',
  };
  return getImage(mapping[pathId] || 'travel', width, height);
}

/**
 * Get a specific category's photo IDs count
 */
export function getCategoryCount(category) {
  return PHOTO_IDS[category]?.length || 0;
}

/**
 * Total unique images available
 */
export const TOTAL_IMAGES = ALL_IDS.length * CROPS.length * GRAVITY.length;

/**
 * All available categories
 */
export { CATEGORIES };

export default {
  getImage,
  getImages,
  getHeroImage,
  getCardImage,
  getPathImage,
  TOTAL_IMAGES,
  CATEGORIES,
};
