class PeriodicTableUI {
  constructor() {
    this._toolbarElem = document.createElement('div');
    this._toolbarElem.setAttribute('id', 'periodicTableToolbar');
    document.body.appendChild(this._toolbarElem);

    this._toolbarButtons = {};
    this._toolbarButtonClickHandlers = {};
  }

  destroy() {
    Object.values(this._toolbarButtonClickHandlers).forEach(handler => {
      button.removeEventListener('click', handler, true);
    });
  }

  addToolbarButton(id, label, handler) {
    const button = document.createElement('div');
    button.setAttribute('id', id);
    button.setAttribute('class', 'toolbarButton');
    button.innerHTML = label;
    if (handler) {
      button.addEventListener('click', handler, true);
      this._toolbarButtonClickHandlers[id] = handler;
    }
    this._toolbarButtons[id] = button;
    this._toolbarElem.appendChild(button);
  }
}