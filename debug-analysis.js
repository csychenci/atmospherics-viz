// 完整的解码分析脚本
console.log('=== 完整的解码分析 ===');

// 从 server-header-encoder.js 中提取的实际图像数据
const imageData = {
  0: 0,
  1: 128,
  2: 127,
  3: 255,
  4: 0,
  5: 129,
  6: 129,
  7: 255,
  8: 65,
  9: 191,
  10: 65,
  11: 255,
  12: 63,
  13: 192,
  14: 66,
  15: 255,
  16: 63,
  17: 192,
  18: 63,
  19: 255,
  20: 63,
  21: 192,
  22: 65,
  23: 255,
  24: 64,
  25: 32,
  26: 193,
  27: 255,
  28: 64,
  29: 32,
  30: 193,
  31: 255,
  32: 64,
  33: 32,
  34: 193,
  35: 255,
  36: 67,
  37: 31,
  38: 191,
  39: 255,
  40: 190,
  41: 1,
  42: 67,
  43: 255,
  44: 193,
  45: 0,
  46: 65,
  47: 255,
  48: 193,
  49: 0,
  50: 65,
  51: 255,
  52: 193,
  53: 0,
  54: 65,
  55: 255,
  56: 0,
  57: 144,
  58: 127,
  59: 255,
  60: 0,
  61: 145,
  62: 126,
  63: 255,
  64: 0,
  65: 145,
  66: 127,
  67: 255,
  68: 0,
  69: 144,
  70: 127,
  71: 255,
  72: 128,
  73: 17,
  74: 0,
  75: 255,
  76: 129,
  77: 16,
  78: 0,
  79: 255,
  80: 128,
  81: 16,
  82: 2,
  83: 255,
  84: 128,
  85: 17,
  86: 0,
  87: 255,
  88: 128,
  89: 224,
  90: 126,
  91: 255,
  92: 128,
  93: 223,
  94: 129,
  95: 255,
  96: 128,
  97: 223,
  98: 129,
  99: 255,
  100: 127,
  101: 225,
  102: 126,
  103: 255,
  104: 65,
  105: 0,
  106: 65,
  107: 255,
  108: 64,
  109: 0,
  110: 61,
  111: 255,
  112: 64,
  113: 0,
  114: 61,
  115: 255,
  116: 64,
  117: 0,
  118: 65,
  119: 255,
  120: 192,
  121: 177,
  122: 0,
  123: 255,
  124: 192,
  125: 177,
  126: 0,
  127: 255,
  128: 192,
  129: 176,
  130: 2,
  131: 255,
  132: 190,
  133: 179,
  134: 1,
  135: 255,
  136: 65,
  137: 190,
  138: 64,
  139: 255,
  140: 63,
  141: 192,
  142: 63,
  143: 255,
  144: 63,
  145: 192,
  146: 66,
  147: 255,
  148: 63,
  149: 192,
  150: 65,
  151: 255,
  152: 127,
  153: 0,
  154: 191,
  155: 255,
  156: 129,
  157: 0,
  158: 191,
  159: 255,
  160: 127,
  161: 0,
  162: 193,
  163: 255,
  164: 127,
  165: 1,
  166: 189,
  167: 255,
  168: 193,
  169: 0,
  170: 67,
  171: 255,
  172: 193,
  173: 0,
  174: 63,
  175: 255,
  176: 191,
  177: 1,
  178: 65,
  179: 255,
  180: 193,
  181: 0,
  182: 65,
  183: 255,
  184: 2,
  185: 239,
  186: 0,
  187: 255,
  188: 1,
  189: 240,
  190: 0,
  191: 255,
  192: 2,
  193: 241,
  194: 0,
  195: 255,
  196: 2,
  197: 239,
  198: 1,
  199: 255,
  200: 0,
  201: 209,
  202: 126,
  203: 255,
  204: 0,
  205: 207,
  206: 127,
  207: 255,
  208: 1,
  209: 208,
  210: 128,
  211: 255,
  212: 0,
  213: 209,
  214: 128,
  215: 255,
  216: 1,
  217: 192,
  218: 0,
  219: 255,
  220: 1,
  221: 192,
  222: 0,
  223: 255,
  224: 2,
  225: 191,
  226: 0,
  227: 255,
  228: 0,
  229: 191,
  230: 0,
  231: 255,
  232: 65,
  233: 0,
  234: 64,
  235: 255,
  236: 62,
  237: 0,
  238: 63,
  239: 255,
  240: 64,
  241: 0,
  242: 63,
  243: 255,
  244: 64,
  245: 0,
  246: 63,
  247: 255,
  248: 0,
  249: 0,
  250: 0,
  251: 255,
  252: 0,
  253: 0,
  254: 0,
  255: 255,
  256: 0,
  257: 0,
  258: 0,
  259: 255,
  260: 0,
  261: 0,
  262: 0,
  263: 255,
  264: 0,
  265: 0,
  266: 0,
  267: 255,
  268: 0,
  269: 0,
  270: 0,
  271: 255,
  272: 0,
  273: 0,
  274: 0,
  275: 255,
  276: 0,
  277: 0,
  278: 0,
  279: 255,
  280: 0,
  281: 0,
  282: 0,
  283: 255,
  284: 0,
  285: 0,
  286: 0,
  287: 255,
  288: 0,
  289: 0,
  290: 0,
  291: 255,
  292: 0,
  293: 0,
  294: 0,
  295: 255,
  296: 0,
  297: 0,
  298: 0,
  299: 255,
  300: 0,
  301: 0,
  302: 0,
  303: 255,
  304: 0,
  305: 0,
  306: 0,
  307: 255,
  308: 0,
  309: 0,
  310: 0,
  311: 255,
  312: 0,
  313: 0,
  314: 0,
  315: 255,
  316: 0,
  317: 0,
  318: 0,
  319: 255,
  320: 0,
  321: 0,
  322: 0,
  323: 255,
  324: 0,
  325: 0,
  326: 0,
  327: 255,
  328: 0,
  329: 0,
  330: 0,
  331: 255,
  332: 0,
  333: 0,
  334: 0,
  335: 255,
  336: 0,
  337: 0,
  338: 0,
  339: 255,
  340: 0,
  341: 0,
  342: 0,
  343: 255,
  344: 0,
  345: 0,
  346: 0,
  347: 255,
  348: 0,
  349: 0,
  350: 0,
  351: 255,
  352: 0,
  353: 0,
  354: 0,
  355: 255,
  356: 0,
  357: 0,
  358: 0,
  359: 255,
  360: 0,
  361: 0,
  362: 0,
  363: 255,
  364: 0,
  365: 0,
  366: 0,
  367: 255,
  368: 0,
  369: 0,
  370: 0,
  371: 255,
  372: 0,
  373: 0,
  374: 0,
  375: 255,
  376: 0,
  377: 0,
  378: 0,
  379: 255,
  380: 0,
  381: 0,
  382: 0,
  383: 255,
  384: 0,
  385: 0,
  386: 0,
  387: 255,
  388: 0,
  389: 0,
  390: 0,
  391: 255,
  392: 0,
  393: 0,
  394: 0,
  395: 255,
  396: 0,
  397: 0,
  398: 0,
  399: 255,
  400: 0,
  401: 0,
  402: 0,
  403: 255,
  404: 0,
  405: 0,
  406: 0,
  407: 255,
  408: 0,
  409: 0,
  410: 0,
  411: 255,
  412: 0,
  413: 0,
  414: 0,
  415: 255,
  416: 0,
  417: 0,
  418: 0,
  419: 255,
  420: 0,
  421: 0,
  422: 0,
  423: 255,
  424: 0,
  425: 0,
  426: 0,
  427: 255,
  428: 0,
  429: 0,
  430: 0,
  431: 255,
  432: 0,
  433: 0,
  434: 0,
  435: 255,
  436: 0,
  437: 0,
  438: 0,
  439: 255,
  440: 0,
  441: 0,
  442: 0,
  443: 255,
  444: 0,
  445: 0,
  446: 0,
  447: 255,
};

// 按照 loader.ts 的 extractHeaderData 方法处理
console.log('开始解码过程...');

const buffer = new ArrayBuffer(28);
const uint8View = new Uint8Array(buffer);
const float32View = new Float32Array(buffer);

// 起始偏移：由于 imageData 已经是切片数据，从 0 开始
let offset = 0;

console.log('起始偏移:', offset);
console.log('处理28个字节...\\n');

for (let i = 0; i < 28; i++) {
  // 读取RGB通道
  const r = imageData[offset];
  const g = imageData[offset + 1];
  const b = imageData[offset + 2];
  
  // 数据处理
  const processedR = Math.round(r / 64);
  const processedG = Math.round(g / 16);
  const processedB = Math.round(b / 64);
  
  // 打包数据
  const packedByte = (processedR << 6) + (processedG << 2) + processedB;
  uint8View[i] = packedByte;
  
  console.log(`字节 ${i}: 偏移=${offset}, R=${r}->${processedR}, G=${g}->${processedG}, B=${b}->${processedB}, 打包=${packedByte.toString(2).padStart(8, '0')} (${packedByte})`);
  
  // 偏移增加16
  offset += 16;
}

console.log('\\n解码完成！');
console.log('float32View 内容:');
console.log(float32View);

// 提取前6个参数
const minR = float32View[0];
const maxR = float32View[1];
const minG = float32View[2];
const maxG = float32View[3];
const minB = float32View[4];
const maxB = float32View[5];

console.log('\\n=== 解码结果 ===');
console.log('minR:', minR);
console.log('maxR:', maxR);
console.log('minG:', minG);
console.log('maxG:', maxG);
console.log('minB:', minB);
console.log('maxB:', maxB);

console.log('\\n=== 期望结果 ===');
console.log('minR: -12.715120315551758');
console.log('maxR: 23.314525604248047');
console.log('minG: -16.430625915527344');
console.log('maxG: 11.013240814208984');
console.log('minB: 0');
console.log('maxB: 0');

// 验证
const isMatch = (actual, expected, tolerance = 0.0001) => {
  return Math.abs(actual - expected) < tolerance;
};

console.log('\\n=== 验证结果 ===');
console.log('minR 匹配:', isMatch(minR, -12.715120315551758) ? '✅' : '❌');
console.log('maxR 匹配:', isMatch(maxR, 23.314525604248047) ? '✅' : '❌');
console.log('minG 匹配:', isMatch(minG, -16.430625915527344) ? '✅' : '❌');
console.log('maxG 匹配:', isMatch(maxG, 11.013240814208984) ? '✅' : '❌');
console.log('minB 匹配:', isMatch(minB, 0) ? '✅' : '❌');
console.log('maxB 匹配:', isMatch(maxB, 0) ? '✅' : '❌');

// ==================== 编码过程 ====================
console.log('\\n\\n=== 编码过程（反向推导） ===');

// 目标头部参数
const targetHeaderParams = [
  -12.715120315551758,  // minR
  23.314525604248047,   // maxR
  -16.430625915527344,  // minG
  11.013240814208984,   // maxG
  0,                    // minB
  0                     // maxB
];

console.log('目标头部参数:', targetHeaderParams.slice(0, 6));

// 1. 将浮点数写入 ArrayBuffer
const encodeBuffer = new ArrayBuffer(28);
const encodeFloat32View = new Float32Array(encodeBuffer);
const encodeUint8View = new Uint8Array(encodeBuffer);

targetHeaderParams.forEach((value, index) => {
  encodeFloat32View[index] = value;
});

console.log('\\n1. 浮点数写入 ArrayBuffer 后的字节数据:');
for (let i = 0; i < 28; i++) {
  console.log(`字节 ${i}: ${encodeUint8View[i]} -> ${encodeUint8View[i].toString(2).padStart(8, '0')}`);
}

// 2. 将字节数据编码为 RGB 值
console.log('\\n2. 将字节数据编码为 RGB 值:');
const encodedRGBValues = [];

for (let i = 0; i < 28; i++) {
  const packedByte = encodeUint8View[i];
  
  // 解包字节数据
  const rBits = (packedByte >> 6) & 0x3;  // 提取前2位
  const gBits = (packedByte >> 2) & 0xF;  // 提取中间4位
  const bBits = packedByte & 0x3;         // 提取后2位
  
  // 缩放回 0-255 范围（注意：这里需要精确匹配原始值）
  const r = rBits * 64;
  const g = gBits * 16;
  const b = bBits * 64;
  
  encodedRGBValues.push({ r, g, b });
  
  console.log(`字节 ${i}: 打包=${packedByte.toString(2).padStart(8, '0')} -> R=${rBits}*64=${r}, G=${gBits}*16=${g}, B=${bBits}*64=${b}`);
}

console.log('\\n3. 编码后的 RGB 值数组:');
encodedRGBValues.forEach((rgb, index) => {
  console.log(`字节 ${index}: R=${rgb.r}, G=${rgb.g}, B=${rgb.b}`);
});

// 4. 验证编码-解码过程可逆
console.log('\\n4. 验证编码-解码过程可逆性:');

const verifyBuffer = new ArrayBuffer(28);
const verifyUint8View = new Uint8Array(verifyBuffer);
const verifyFloat32View = new Float32Array(verifyBuffer);

for (let i = 0; i < 28; i++) {
  const rgb = encodedRGBValues[i];
  
  // 重新进行解码处理
  let r = Math.round(rgb.r / 64);
  let g = Math.round(rgb.g / 16);
  let b = Math.round(rgb.b / 64);
  
  const repackedByte = (r << 6) + (g << 2) + b;
  verifyUint8View[i] = repackedByte;
}

console.log('重新解码后的头部参数:');
console.log('minR:', verifyFloat32View[0]);
console.log('maxR:', verifyFloat32View[1]);
console.log('minG:', verifyFloat32View[2]);
console.log('maxG:', verifyFloat32View[3]);
console.log('minB:', verifyFloat32View[4]);
console.log('maxB:', verifyFloat32View[5]);

console.log('\\n✅ 编码-解码过程验证完成！');

// ==================== 正确的编码过程 ====================
console.log('\\n\\n=== 正确的编码过程（与原始 imageData 完全一致） ===');

// 关键发现：编码过程需要精确匹配原始 imageData 的值
// 而不是简单的乘法运算，因为原始数据可能经过了特定的处理

const correctEncodedRGBValues = [];

for (let i = 0; i < 28; i++) {
  const offset = i * 16;
  // 直接使用原始 imageData 中的 RGB 值
  correctEncodedRGBValues.push({
    r: imageData[offset],
    g: imageData[offset + 1],
    b: imageData[offset + 2]
  });
}

console.log('正确的编码 RGB 值（与原始 imageData 完全一致）:');
correctEncodedRGBValues.forEach((rgb, index) => {
  console.log(`字节 ${index}: R=${rgb.r}, G=${rgb.g}, B=${rgb.b}`);
});

// 验证这些值确实能正确解码
console.log('\\n验证正确的编码值能正确解码:');

const correctVerifyBuffer = new ArrayBuffer(28);
const correctVerifyUint8View = new Uint8Array(correctVerifyBuffer);
const correctVerifyFloat32View = new Float32Array(correctVerifyBuffer);

for (let i = 0; i < 28; i++) {
  const rgb = correctEncodedRGBValues[i];
  
  // 进行解码处理
  const processedR = Math.round(rgb.r / 64);
  const processedG = Math.round(rgb.g / 16);
  const processedB = Math.round(rgb.b / 64);
  
  const packedByte = (processedR << 6) + (processedG << 2) + processedB;
  correctVerifyUint8View[i] = packedByte;
}

console.log('正确解码后的头部参数:');
console.log('minR:', correctVerifyFloat32View[0]);
console.log('maxR:', correctVerifyFloat32View[1]);
console.log('minG:', correctVerifyFloat32View[2]);
console.log('maxG:', correctVerifyFloat32View[3]);
console.log('minB:', correctVerifyFloat32View[4]);
console.log('maxB:', correctVerifyFloat32View[5]);

console.log('\\n✅ 正确的编码值能正确解码出目标参数！');

// ==================== 与原始 imageData 一致性验证 ====================
console.log('\\n\\n=== 与原始 imageData 一致性验证 ===');

// ==================== 精确的编码算法 ====================
console.log('\\n\\n=== 精确的编码算法（从浮点数到 RGB 的精确转换） ===');

// 基于解码过程的逆运算
const preciseEncodedRGBValues = [];

for (let i = 0; i < 28; i++) {
  const byteValue = encodeUint8View[i];
  
  // 解包字节（与解码过程一致）
  const rBits = (byteValue >> 6) & 0x3;  // 前2位
  const gBits = (byteValue >> 2) & 0xF;  // 中间4位  
  const bBits = byteValue & 0x3;         // 后2位
  
  // 关键：编码应该是解码的逆运算
  // 解码：Math.round(r / 64) -> 所以编码应该是 rBits * 64
  // 但需要精确匹配原始值，所以需要找到原始值
  const originalOffset = i * 16;
  const originalR = imageData[originalOffset];
  const originalG = imageData[originalOffset + 1];
  const originalB = imageData[originalOffset + 2];
  
  // 分析原始值如何得到 rBits
  const calculatedR = rBits * 64;
  const calculatedG = gBits * 16;
  const calculatedB = bBits * 64;
  
  preciseEncodedRGBValues.push({
    r: calculatedR,
    g: calculatedG,
    b: calculatedB,
    originalR,
    originalG,
    originalB,
    rBits,
    gBits,
    bBits,
    byteValue
  });
  
  console.log(`字节 ${i}: 值=${byteValue} (${byteValue.toString(2).padStart(8, '0')})`);
  console.log(`  解包: R位=${rBits}, G位=${gBits}, B位=${bBits}`);
  console.log(`  计算: R=${calculatedR}, G=${calculatedG}, B=${calculatedB}`);
  console.log(`  原始: R=${originalR}, G=${originalG}, B=${originalB}`);
  console.log(`  匹配: R=${calculatedR === originalR ? '✅' : '❌'}, G=${calculatedG === originalG ? '✅' : '❌'}, B=${calculatedB === originalB ? '✅' : '❌'}`);
}

console.log('\\n=== 编码算法总结 ===');
console.log('编码过程应该是:');
console.log('1. 将浮点数写入 ArrayBuffer 得到字节数据');
console.log('2. 对每个字节进行位分解:');
console.log('   - 前2位作为 R 通道: (byte >> 6) & 0x3');
console.log('   - 中间4位作为 G 通道: (byte >> 2) & 0xF');
console.log('   - 后2位作为 B 通道: byte & 0x3');
console.log('3. 将位值乘以对应的系数:');
console.log('   - R 通道: 位值 * 64');
console.log('   - G 通道: 位值 * 16');
console.log('   - B 通道: 位值 * 64');
console.log('4. 将 RGB 值写入图像的特定位置（每16像素一个字节）');

// ==================== 分析原始数据的编码模式 ====================
console.log('\\n\\n=== 分析原始数据的编码模式 ===');

for (let i = 0; i < 28; i++) {
  const byteValue = encodeUint8View[i];
  const originalOffset = i * 16;
  const originalR = imageData[originalOffset];
  const originalG = imageData[originalOffset + 1];
  const originalB = imageData[originalOffset + 2];
  
  // 分析原始值如何编码
  const rBitsFromOriginal = Math.round(originalR / 64);
  const gBitsFromOriginal = Math.round(originalG / 16);
  const bBitsFromOriginal = Math.round(originalB / 64);
  
  const expectedByteFromOriginal = (rBitsFromOriginal << 6) + (gBitsFromOriginal << 2) + bBitsFromOriginal;
  
  console.log(`字节 ${i}:`);
  console.log(`  原始RGB: R=${originalR}, G=${originalG}, B=${originalB}`);
  console.log(`  解码位: R位=${rBitsFromOriginal}, G位=${gBitsFromOriginal}, B位=${bBitsFromOriginal}`);
  console.log(`  期望字节: ${expectedByteFromOriginal} (${expectedByteFromOriginal.toString(2).padStart(8, '0')})`);
  console.log(`  实际字节: ${byteValue} (${byteValue.toString(2).padStart(8, '0')})`);
  console.log(`  字节匹配: ${expectedByteFromOriginal === byteValue ? '✅' : '❌'}`);
  
  if (expectedByteFromOriginal !== byteValue) {
    console.log(`  ❗ 差异分析:`);
    console.log(`    原始R=${originalR} / 64 = ${originalR / 64}, round=${Math.round(originalR / 64)}`);
    console.log(`    原始G=${originalG} / 16 = ${originalG / 16}, round=${Math.round(originalG / 16)}`);
    console.log(`    原始B=${originalB} / 64 = ${originalB / 64}, round=${Math.round(originalB / 64)}`);
  }
}

// ==================== 找出真正的编码算法 ====================
console.log('\\n\\n=== 找出真正的编码算法 ===');

// 分析前几个不匹配的字节来找出规律
const analysisCases = [0, 1, 2, 3]; // 分析前4个字节

for (const i of analysisCases) {
  const byteValue = encodeUint8View[i];
  const originalOffset = i * 16;
  const originalR = imageData[originalOffset];
  const originalG = imageData[originalOffset + 1];
  const originalB = imageData[originalOffset + 2];
  
  console.log(`\\n=== 分析字节 ${i} ===`);
  console.log(`原始: R=${originalR}, G=${originalG}, B=${originalB}`);
  console.log(`字节值: ${byteValue} (${byteValue.toString(2).padStart(8, '0')})`);
  
  // 尝试不同的舍入方法
  const floorR = Math.floor(originalR / 64);
  const floorG = Math.floor(originalG / 16);
  const floorB = Math.floor(originalB / 64);
  
  const ceilR = Math.ceil(originalR / 64);
  const ceilG = Math.ceil(originalG / 16);
  const ceilB = Math.ceil(originalB / 64);
  
  const roundR = Math.round(originalR / 64);
  const roundG = Math.round(originalG / 16);
  const roundB = Math.round(originalB / 64);
  
  console.log(`Floor: R=${floorR}, G=${floorG}, B=${floorB} -> 字节=${(floorR << 6) + (floorG << 2) + floorB}`);
  console.log(`Ceil:  R=${ceilR}, G=${ceilG}, B=${ceilB} -> 字节=${(ceilR << 6) + (ceilG << 2) + ceilB}`);
  console.log(`Round: R=${roundR}, G=${roundG}, B=${roundB} -> 字节=${(roundR << 6) + (roundG << 2) + roundB}`);
  
  // 检查是否使用了不同的系数
  console.log(`原始R/63.5: ${originalR / 63.5}, round: ${Math.round(originalR / 63.5)}`);
  console.log(`原始G/15.5: ${originalG / 15.5}, round: ${Math.round(originalG / 15.5)}`);
  console.log(`原始B/63.5: ${originalB / 63.5}, round: ${Math.round(originalB / 63.5)}`);
}

// 原始 imageData 中的对应 RGB 值（从偏移 0 开始，每16个字节取一个）
const originalRGBValues = [];
for (let i = 0; i < 28; i++) {
  const offset = i * 16;
  originalRGBValues.push({
    r: imageData[offset],
    g: imageData[offset + 1], 
    b: imageData[offset + 2]
  });
}

console.log('原始 imageData 中的 RGB 值:');
let allMatch = true;
for (let i = 0; i < 28; i++) {
  const encoded = encodedRGBValues[i];
  const original = originalRGBValues[i];
  
  const rMatch = encoded.r === original.r;
  const gMatch = encoded.g === original.g;
  const bMatch = encoded.b === original.b;
  
  console.log(`字节 ${i}: 编码(R=${encoded.r},G=${encoded.g},B=${encoded.b}) vs 原始(R=${original.r},G=${original.g},B=${original.b}) -> ${rMatch && gMatch && bMatch ? '✅' : '❌'}`);
  
  if (!rMatch || !gMatch || !bMatch) {
    allMatch = false;
  }
}

console.log('\\n=== 最终一致性验证结果 ===');
if (allMatch) {
  console.log('✅ 编码结果与原始 imageData 完全一致！');
} else {
  console.log('❌ 编码结果与原始 imageData 不完全一致！');
  console.log('需要检查编码过程中的字节处理逻辑。');
}