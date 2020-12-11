import React, { Component } from "react";
import { Circle, Map, Marker, Popup, TileLayer } from "react-leaflet";
import ModelAPI from "./modelapi";
import { areaToStr, strToArea } from "./covid19util";

import * as am4core from "@amcharts/amcharts4/core";
import * as am4maps from "@amcharts/amcharts4/maps";
import am4geodata_worldLow from "@amcharts/amcharts4-geodata/worldLow";
import am4geodata_usaLow from "@amcharts/amcharts4-geodata/usaLow";
import am4geodata_chinaLow from "@amcharts/amcharts4-geodata/chinaLow";
import am4geodata_canadaLow from "@amcharts/amcharts4-geodata/canadaLow";
import am4geodata_australiaLow from "@amcharts/amcharts4-geodata/australiaLow";
import am4themes_animated from "@amcharts/amcharts4/themes/animated";

const HEAT_MAP_MIN_COLOR = "#fcbba0";
const HEAT_MAP_MAX_COLOR = "#66000d";
const MAP_HOVER_COLOR = "#e43027";

am4core.useTheme(am4themes_animated);

class Covid19Map extends Component {
  constructor() {
    super();
    this.modelAPI = new ModelAPI();

    this.modelAPI.areas(allAreas =>
      this.setState({
        areasList: allAreas
      })
    );
  }

  componentDidMount() {
    this.props.triggerRef(this);
    this.fetchData(this.props.dynamicMapOn);
  }

  fetchData(dynamicMapOn) {
    if (!dynamicMapOn || this.props.model === "") {
      this.modelAPI.cumulative_infections(cumulativeInfections => {
        let heatmapData = cumulativeInfections.map(d => {
          return {
            id: d.area.iso_2,
            // Adjust all heatmap values by log scale.
            value: d.value > 0 ? Math.log(d.value) : 0,
            // Store the true value so we can display tooltips correctly.
            valueTrue: d.value,
            area: d.area
          };
        });
        this.setState({ heatmapData }, this.createChart);
      });
    } else {
      this.modelAPI.predict_all({
        days: this.props.days,
        model: this.props.model
      }, cumulativeInfections => {
        let heatmapData = cumulativeInfections.map(d => {
          return {
            id: d.area.iso_2,
            // Adjust all heatmap values by log scale.
            value: d.value > 0 ? Math.log(d.value) : 0,
            // Store the true value so we can display tooltips correctly.
            valueTrue: d.value,
            area: d.area
          };
        });
        this.setState({ heatmapData }, this.resetChart);
      });
      
    }
  }

  initChart() {
    // Create map instance
    this.chart = am4core.create("chartdiv", am4maps.MapChart);
    // Set projection
    this.chart.projection = new am4maps.projections.Mercator();
  }

  createChartSeries(seriesProps) {
    // Create new map polygon series and copy over all given props.
    let series = this.chart.series.push(new am4maps.MapPolygonSeries());
    series = Object.assign(series, seriesProps);

    let polygonTemplate = series.mapPolygons.template;

    // Heatmap fill.
    series.heatRules.push({
      property: "fill",
      target: polygonTemplate,
      min: am4core.color(HEAT_MAP_MIN_COLOR),
      max: am4core.color(HEAT_MAP_MAX_COLOR),
      maxValue: Math.log(5000000)
    });

    // Configure series tooltip. Display the true value of infections.
    polygonTemplate.tooltipText = "{name}: {valueTrue}";
    polygonTemplate.nonScalingStroke = true;
    polygonTemplate.strokeWidth = 0.5;

    // Create hover state and set alternative fill color.
    let hs = polygonTemplate.states.create("hover");
    hs.properties.fill = am4core.color(MAP_HOVER_COLOR);

    // Change mouse cursor to pointer.
    polygonTemplate.cursorOverStyle = am4core.MouseCursorStyle.pointer;

    // Create click handler. Apparently ALL the series in the chart must have
    // click handlers activated, so if this function is not running double-check
    // that other series also have click handlers.
    const { onMapClick } = this.props;
    polygonTemplate.events.on("hit", e => {
      const { id, value, area } = e.target.dataItem.dataContext;
      onMapClick(area);
    });

    return series;
  }

  initChartInterface() {
    // Create a zoom control.
    this.chart.zoomControl = new am4maps.ZoomControl();
    this.chart.zoomControl.cursorOverStyle = am4core.MouseCursorStyle.pointer;

    // Create a toggle button to show/hide states/provinces.
    let button = this.chart.chartContainer.createChild(am4core.Button);
    button.label.text = "Show States/Provinces";
    button.togglable = true;
    button.padding(5, 5, 5, 5);
    button.align = "right";
    button.marginRight = 15;
    button.cursorOverStyle = am4core.MouseCursorStyle.pointer;
    button.events.on("hit", () => {
      this.stateSeries.forEach(s => (s.disabled = !button.isActive));
      button.label.text = `${
        button.isActive ? "Hide" : "Show"
        } States/Provinces`;
    });
  }

  createChart() {
    const { heatmapData } = this.state;

    this.initChart();

    const worldSeries = this.createChartSeries({
      geodata: am4geodata_worldLow,
      exclude: ["AQ"],
      data: heatmapData
    });

    const chinaSeries = this.createChartSeries({
      geodata: am4geodata_chinaLow,
      data: heatmapData,
      disabled: true
    });

    const usaSeries = this.createChartSeries({
      geodata: am4geodata_usaLow,
      data: heatmapData,
      disabled: true
    });

    const canadaSeries = this.createChartSeries({
      geodata: am4geodata_canadaLow,
      data: heatmapData,
      disabled: true
    });

    const australiaSeries = this.createChartSeries({
      geodata: am4geodata_australiaLow,
      data: heatmapData,
      disabled: true
    });

    this.stateSeries = [chinaSeries, usaSeries, canadaSeries, australiaSeries];

    this.initChartInterface();

    // worldSeries.data = [
    // {
    //   id: "US",
    //   disabled: true
    // },
    // {
    //   id: "China",
    //   disabled: true
    // }
    // ];

    // Set up heat legend
    // let heatLegend = this.chart.createChild(am4maps.HeatLegend);
    // heatLegend.series = worldSeries;
    // heatLegend.align = "right";
    // heatLegend.valign = "bottom";
    // heatLegend.width = am4core.percent(20);
    // heatLegend.marginRight = am4core.percent(4);
    // heatLegend.minValue = 0;
    // heatLegend.maxValue = Math.max(...heatmapData.map(d => d.valueTrue));
    //
    // // Set up custom heat map legend labels using axis ranges
    // let minRange = heatLegend.valueAxis.axisRanges.create();
    // minRange.value = heatLegend.minValue;
    // minRange.label.text = heatLegend.minValue;
    // let maxRange = heatLegend.valueAxis.axisRanges.create();
    // maxRange.value = heatLegend.maxValue;
    // maxRange.label.text = heatLegend.maxValue;
    //
    // // Blank out internal heat legend value axis labels
    // heatLegend.valueAxis.renderer.labels.template.adapter.add("text", function(
    //   labelText
    // ) {
    //   return "";
    // });
  }

  resetChart() {
    const { heatmapData } = this.state;

    const worldSeries = this.createChartSeries({
      geodata: am4geodata_worldLow,
      exclude: ["AQ"],
      data: heatmapData
    });

    const usaSeries = this.createChartSeries({
      geodata: am4geodata_usaLow,
      data: heatmapData,
      disabled: true
    });

    this.stateSeries = [usaSeries];

  }

  componentWillUnmount() {
    if (this.chart) {
      this.chart.dispose();
    }
  }

  render() {
    
    return <div id="chartdiv"></div>;
  }
}

export default Covid19Map;
