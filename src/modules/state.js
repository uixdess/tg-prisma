let state = false;

async function setState(s) {
  state = s;
}

function getState() {
  return state;
}

module.exports = { setState, getState };
