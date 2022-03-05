Input = {};

/**
 * keydown, keyup時のコールバック関数を設定する
 */
Input.setup = (keydownEvent, keyupEvent) => 
{
  if (keydownEvent) {
    document.addEventListener("keydown", (e) => {
      keydownEvent(e);
    })
  }

  if (keyupEvent) {
    document.addEventListener("keyup", (e) => {
      keyupEvent(e);
    })
  }
}