import React, { Component } from "react";
import {notification } from 'antd';
import Covid19Predict from "./covid19predict";

import "./covid19app.css";

const showReDirectLink = () => {
  const args = {
    message: 'Please move to our new website!',
    description:'This website is deprecated. The dashboard has moved to link: https://scc-usc.github.io/ReCOVER-COVID-19/',
    duration: 0,
  };
  notification.open(args);
};
class Covid19App extends Component {
  render() {
    return (
      <div className="app-wrapper" onClick={showReDirectLink}>
        <Covid19Predict />
      </div>
    );
  }
}

export default Covid19App;
