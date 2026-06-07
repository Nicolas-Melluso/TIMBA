export type EndStateLayout = {
  panelY: number;
  panelHeight: number;
  buttonY: number;
  showRunRecap: boolean;
};

export function endStateLayout(terminal: boolean): EndStateLayout {
  if (terminal) {
    return {
      panelY: 186,
      panelHeight: 376,
      buttonY: 492,
      showRunRecap: true
    };
  }
  return {
    panelY: 206,
    panelHeight: 310,
    buttonY: 424,
    showRunRecap: false
  };
}
