/**
 * 运行时环境初始化。
 *
 * 必须在其它模块（尤其是 src/kugou/util）之前被 import，
 * 因为酷狗库在模块加载时会根据 process.env.platform 选择标准版/概念版。
 *
 * 这里默认使用概念版（youth/青春版，酷狗内部称 lite）：
 * - appid 3116 / clientver 11440
 * - 对应的盐值与接口（/youth/...）
 *
 * 如需切回标准版，设置环境变量 MUSIC_KUGOU_PLATFORM=standard 即可。
 */
const platform = process.env.MUSIC_KUGOU_PLATFORM;

if (platform !== 'standard') {
  process.env.platform = 'lite';
}
