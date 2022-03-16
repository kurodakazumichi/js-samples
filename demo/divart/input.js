Input = {};

/**
 * keydownイベントを設定する
 * @param {EventFunction} keydownEvent 
 */
Input.addEventKewDown = (keydownEvent) => {
  document.addEventListener("keydown", (e) => {
    keydownEvent(e);
  })
}

/**
 * keyupイベントを設定する
 * @param {EventFunction} keydownEvent 
 */
Input.addEventKeyup = (keyupEvent) => {
  document.addEventListener("keyup", (e) => {
    keyupEvent(e);
  })
}

/**
 * Gamepadクラス
 */
Input.Gamepad = class 
{
  constructor(gamepad) {
    this.context = gamepad;
  }

  get id () {
    return this.context.id;
  }

  get index() {
    return this.context.index;
  }

  get axisNum() {
    return this.context.axes.length;
  }

  get buttonNum() {
    return this.context.buttons.length;
  }  

  /**
   * navigator.getGamepads()で取得したgamepadリストに存在するか
   */
  get exists() {
    return !!navigator.getGamepads()[this.index];
  }

  get mapping() {
    return this.context.mapping;
  }

  get gamepad() {
    return navigator.getGamepads()[this.index];
  }

  get buttons() {
    return this.gamepad.buttons;
  }

  get axes() {
    return this.gamepad.axes;
  }

  /**
   * 途中でゲームパッドがなくなった、変更されたなどでリフレッシュが必要かどうか
   */
   get needsReflash() 
   {
     // 存在しなくなったのなら更新が必要
     if(!this.exists) {
       return true;
     }
 
     // 生成時とidが変わってるのなら更新が必要
     return (this.id !== this.gamepad.id);
   }
 
   get enabled() 
   {
     if (!this.exists) {
       return false;
     }
 
     return !this.needsReflash;
   }

   refresh() {
     if (!this.needsReflash) {
       return;
     }

     this.context = this.gamepad;
   }
}

/**
 * Gamepad管理クラス
 */
Input.GamepadManager = class 
{
  constructor() {
    this.gamepads = [];

    window.addEventListener("gamepadconnected",(e) => {
      this.gamepads[e.gamepad.index] = new Input.Gamepad(e.gamepad);
    })    
  }

  get gamepadNum() {
    return this.gamepads.length;
  }

  hasGamepad(index) 
  {
    if(!this.gamepads[index]){
      return false;
    }

    return this.gamepads[index].enabled;
  }

  getGamepad(index) 
  {
    if (!this.hasGamepad(index)) {
      return null;
    }

    return this.gamepads[index];
  }

};