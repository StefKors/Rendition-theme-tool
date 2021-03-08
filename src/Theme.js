import React, { useState } from "react";
import { Button } from "rendition";
import * as _ from "lodash";
import "./App.css";
import color from "color";
import { SketchPicker } from "react-color";

const parseColor = (value, mix = value) => {
  const emphasized = color(value)
    .darken(0.4)
    .mix(color(mix), 0.1)
    .hex();
  const main = color(value).hex();
  let de_emphasized = color(value)
    .mix(color(mix), 0.3)
    .lighten(0.4)
    .desaturate(0.6)
    .hex();

  if (color(main).contrast(color(de_emphasized)) <= 1) {
    de_emphasized = color(value)
      .mix(color(mix), 0.3)
      .darken(0.1)
      .desaturate(0.6)
      .hex();
  }

  return {
    emphasized,
    main,
    de_emphasized,
  };
};

const generateTheme = (base) => {
  // States: hover, focus, disabled
  // Variation: emphasized, de-emphasized
  const theme = {};

  _.forEach(base, (value, key) => {
    if (key === "background") {
      return (theme[key] = parseColor(value, base.primary));
    }
    return (theme[key] = parseColor(value));
  });

  return theme;
};

const SwatchGroup = ({ group, label }) => {
  return (
    <div>
      <p>{label}</p>
      <button className="test-button">clicky click</button>
      <button disabled className="test-button">
        clicky click
      </button>
      <div className="grid-3">
        <div className="block" style={{ backgroundColor: group.emphasized }}>
          <div>group.emphasized</div>
          <div>{group.emphasized}</div>
        </div>
        <div className="block" style={{ backgroundColor: group.main }}>
          <div>group.main</div>
          <div>{group.main}</div>
        </div>
        <div className="block" style={{ backgroundColor: group.de_emphasized }}>
          <div>group.de_emphasized</div>
          <div>{group.de_emphasized}</div>
        </div>
      </div>
    </div>
  );
};

const Swatches = ({ theme }) => {
  const components = [];

  _.forEach(theme, function(value, key) {
    components.push(
      <div
        className="block"
        style={{ backgroundColor: value }}
        key={`${key}-${value}`}
      >
        <div>{key}</div>
        <div>{value}</div>
      </div>
    );
  });

  return components;
};

function App() {
  const [background, setBackground] = useState("#ffffff");
  const [text, setText] = useState("#2a506f");
  const [primary, setPrimary] = useState("#00aeef");
  const [secondary, setSecondary] = useState("#efd700");

  const [info, setInfo] = useState("#1496e1");
  const [danger, setDanger] = useState("#d32f2f");
  const [success, setSuccess] = useState("#1ac135");
  const [warning, setWarning] = useState("#fca321");

  const [base, setBase] = useState({
    background,
    text,
    primary,
    secondary,
    danger,
    warning,
    success,
    info,
  });

  console.log(base);

  const theme = generateTheme(base);

  return (
    <div className="App">
      <article
        style={{
          backgroundColor: "papayawhip",
          color: "black",
        }}
      >
        <div className="grid">
          <div>
            <div>
              <SwatchGroup group={theme.background} label="background" />
              <SwatchGroup group={theme.text} label="text" />
              <SwatchGroup group={theme.primary} label="primary" />
              <SwatchGroup group={theme.secondary} label="secondary" />
            </div>
            <div className="grid">
              <pre>{JSON.stringify(theme, null, 4)}</pre>
            </div>
          </div>
          <div className="grid">
            <Swatches theme={base} />
          </div>
        </div>
      </article>
    </div>
  );
}

export default App;
