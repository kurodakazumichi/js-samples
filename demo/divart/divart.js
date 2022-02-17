class DivArt 
{
  /**
   * DivArtのための初期処理、必要なスタイルと大量のdivを生成する。
   * @param {*} id 描画先のdiv 
   * @param {*} cw 1行あたりのdivの数を指定する、10を指定すれば10x10で100個のdivが作られる。
   * @param {*} ds 1つ1つのdivのサイズをpxで指定する、10を指定すれば幅、高さが10pxのdivになる。
   * @param {*} enableMakeImage divを画像ファイルに変換する機能を有効にする
   */
  constructor(id, cw, ds, enableMakeImage=false) {

    this.node = document.getElementById(id); // メインの要素を取得
    this.cw = cw;                            // canvasのサイズ(1行あたりのdivの数)
    this.ds = ds;                            // divのサイズ
    this.size = cw * cw;                     // divの総数
    this.vram = [];                          // vramといいつつ、ただのdivの配列

    this.canvas = document.createElement('canvas');
    this.canvas.width = cw;
    this.canvas.height = cw;
    this.ctx = this.canvas.getContext("2d");

    // divから画像を作る機能が有効な場合のみ作成する
    if (enableMakeImage) {
      this.img = new ImageData(cw, cw);        // 画像
    }

    // 指定されたパラメータから必要なstyleタグを作ってヘッダにぶちこむ
    this._initStyle(id);

    // 指定されたパラメータから必要な数だけdivを作る
    this._initVram();
  }

  _initStyle(id) 
  {
    const { cw, ds } = this;
    const styleTag = document.createElement('style');

    styleTag.innerText = `
    #${id} {
      display: flex;
      width: ${cw * ds}px;
      flex-wrap:wrap;
    }

    #${id} div {
      width: ${ds}px;
      height: ${ds}px;
    }    
    `;
    document.getElementsByTagName('head')[0].insertAdjacentElement('beforeend', styleTag);

  }

  _initVram() 
  {
    for(let i = 0; i < this.size; ++i) {
      this.vram[i] = document.createElement("div");
      this.node.appendChild(this.vram[i]);
    }
  }

  /**
   * 指定した色で塗りつぶす
   * @param {number[]}} c 色
   */
  clear(c = [1, 1, 1]) {
    for(let i = 0; i < this.size; ++i) {
      this.pixel(i, c);
    }
  }

  /**
   * indexで指定したdivを指定した色で塗る
   * @param {number} index vramの要素を指定
   * @param {number[]} c 塗る色を指定、色はrgbの順で配列で指定
   */
  pixel(index, c) {
    const r = c[0] * 255;
    const g = c[1] * 255;
    const b = c[2] * 255;
    this.vram[index].style = `background-color:rgb(${r}, ${g}, ${b})`;

    if (this.img) {
      this.img.data[index * 4]     = r;
      this.img.data[index * 4 + 1] = g;
      this.img.data[index * 4 + 2] = b;
      this.img.data[index * 4 + 3] = 255;
    }
  }

  /**
   * divの色を決定するfrag関数を指定して描画する、フラグメントシェーダーもどき
   * @param {*} frag 色を返す関数
   * @returns number[] rgbを配列で返す[r, g, b]
   */
  draw(frag) 
  {
    if (!frag) return;

    const { cw } = this;
    const half = cw / 2;

    for(let i = 0; i < this.size; ++i) {

      // iをx,y座標に変換し、中心から-1.0 ～ 1.0になるように計算
      //let x = (i % cw) / half - 1.0;
      //let y = (i / cw) / half - 1.0;
      let x = (i % cw) + 0.5 - half;
      let y = (i / cw) + 0.5 - half;
      x = x / half;
      y = y / half;

      this.pixel(i, frag(x, -y));
    }
  }

  render() {
    if (!this.img) return;
    this.ctx.putImageData(this.img, 0, 0);
  }

  toDataURL() 
  {
    if (!this.img) {
      console.log("このメソッドを有効にするには、コンストラクタの第4引数にtrueを指定してください");
      return;
    }

    this.render();
    return this.canvas.toDataURL();
  }
}