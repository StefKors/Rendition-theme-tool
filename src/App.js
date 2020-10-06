import React, { useState } from "react";
import { Button } from "rendition";
import * as _ from "lodash";
import "./App.css";
import color from "color";
import { SketchPicker } from "react-color";

const parseColor = main => {
  return {
    dark: color(main)
      .darken(0.1)
      .hex(),
    main: color(main).hex(),
    light: color(main)
      .lighten(0.1)
      .hex(),
    semilight: color(main)
      .lighten(0.7)
      .saturate(0.05)
      .hex()
  };
};

const Swatch = ({ label, value, theme }) => {
  let labelColor = color(value).isLight()
    ? theme.text.main
    : theme.background.main;

  if (color(labelColor).contrast(color(value)) <= 2) {
    labelColor = color(value)
      .negate()
      .grayscale()
      .hex();
  }

  return (
    <div
      className="swatch"
      style={{
        background: value,
        color: labelColor
      }}
    >
      <div className="label">{label}</div>
      <div className="color">{value}</div>
    </div>
  );
};

const PickerSwatch = ({ label, value, theme, handleUpdate }) => {
  const [showPicker, setPicker] = useState(false);

  const dynamicLabel = showPicker ? "close" : label;

  return (
    <div className="pickerSwatch">
      <div onClick={() => setPicker(!showPicker)}>
        <Swatch label={dynamicLabel} value={value} theme={theme} />
      </div>
      {showPicker && (
        <SketchPicker
          color={value}
          className="colorPicker"
          onChange={pickerValue => handleUpdate(pickerValue.hex)}
        />
      )}
    </div>
  );
};

const generateTheme = base => {
  let newTheme = {};

  _.map(base, (color, key) => {
    newTheme = {
      ...newTheme,
      [key]: parseColor(color.main)
    };
  });

  newTheme.secondary = {
    ...parseColor(
      color(newTheme.primary.dark)
        .desaturate(0.1)
        .darken(0.5)
    )
  };

  newTheme.tertiary = {
    ...parseColor(
      color(newTheme.secondary.main)
        .desaturate(0.5)
        .lighten(1)
    )
  };

  newTheme.quartenary = {
    ...parseColor(
      color(newTheme.tertiary.main)
        .desaturate(0.2)
        .lighten(1)
    )
  };

  return {
    background: newTheme.background,
    text: newTheme.text,
    border: newTheme.border,
    primary: newTheme.primary,
    secondary: newTheme.secondary,
    tertiary: newTheme.tertiary,
    quartenary: newTheme.quartenary,
    gray: newTheme.gray,
    info: newTheme.info,
    danger: newTheme.danger,
    success: newTheme.success,
    warning: newTheme.warning
  };
};

function App() {
  // Dark
  const [background, setBackground] = useState("#282C34");
  const [text, setText] = useState("#E9E9E9");
  const [border, setBorder] = useState("#171724");
  const [primary, setPrimary] = useState("#7B69C0");
  // Light
  // const [background, setBackground] = useState("#ffffff");
  // const [text, setText] = useState("#2a506f");
  // const [border, setBorder] = useState("#e2e2e2");
  // const [primary, setPrimary] = useState("#00aeef");
  const [gray, setGray] = useState("#c6c8c9");
  const [info, setInfo] = useState("#1496e1");
  const [danger, setDanger] = useState("#d32f2f");
  const [success, setSuccess] = useState("#1ac135");
  const [warning, setWarning] = useState("#fca321");

  const theme = generateTheme({
    background: {
      main: background
    },
    text: {
      main: text
    },
    border: {
      main: border
    },
    primary: {
      main: primary
    },
    gray: {
      main: gray
    },
    info: {
      main: info
    },
    danger: {
      main: danger
    },
    success: {
      main: success
    },
    warning: {
      main: warning
    }
  });

  return (
    <div className="App">
      <article
        style={{
          backgroundColor: theme.background.main,
          color: theme.text.main
        }}
      >
        <div className="summary">
          <h2>Theme generator</h2>
          <p>
            based on the primary color, this generates a secondary, tertiary,
            quartenary colors and shades.
          </p>

          <Button
            color="white"
            backgroundColor={theme.primary.main}
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(theme, null, 2));
            }}
          >
            Copy theme
          </Button>
        </div>

        <div className="controls">
          <PickerSwatch
            label="background"
            value={background}
            theme={theme}
            handleUpdate={setBackground}
          />
          <PickerSwatch
            label="text"
            value={text}
            theme={theme}
            handleUpdate={setText}
          />
          <PickerSwatch
            label="border"
            value={border}
            theme={theme}
            handleUpdate={setBorder}
          />
          <PickerSwatch
            label="primary"
            value={primary}
            theme={theme}
            handleUpdate={setPrimary}
          />
          <PickerSwatch
            label="gray"
            value={gray}
            theme={theme}
            handleUpdate={setGray}
          />
          <PickerSwatch
            label="info"
            value={info}
            theme={theme}
            handleUpdate={setInfo}
          />
          <PickerSwatch
            label="danger"
            value={danger}
            theme={theme}
            handleUpdate={setDanger}
          />
          <PickerSwatch
            label="success"
            value={success}
            theme={theme}
            handleUpdate={setSuccess}
          />
          <PickerSwatch
            label="warning"
            value={warning}
            theme={theme}
            handleUpdate={setWarning}
          />
        </div>
        <div className="grid">
          {theme &&
            _.map(theme, (color, key) => {
              return (
                <div
                  key={key}
                  className="block"
                  style={{ borderColor: theme.border.main }}
                >
                  <div
                    className="name"
                    style={{ borderColor: theme.border.main }}
                  >
                    {key}
                  </div>
                  <div className="grid-4">
                    <Swatch label="dark" value={color.dark} theme={theme} />
                    <Swatch label="main" value={color.main} theme={theme} />
                    <Swatch label="light" value={color.light} theme={theme} />
                    <Swatch
                      label="semilight"
                      value={color.semilight}
                      theme={theme}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </article>
    </div>
  );
}

export default App;
