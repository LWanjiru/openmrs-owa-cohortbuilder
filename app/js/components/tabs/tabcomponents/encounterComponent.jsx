/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/. OpenMRS is also distributed under
 * the terms of the Healthcare Disclaimer located at http://openmrs.org/license.
 *
 * Copyright (C) OpenMRS Inc. OpenMRS is a registered trademark and the OpenMRS
 * graphic logo is a trademark of OpenMRS Inc.
 */

import React, { Component, PropTypes } from 'react';
import shortId from 'shortid';
import Select from 'react-select';
import DatePicker from "react-bootstrap-date-picker";
import { JSONHelper } from '../../../helpers/jsonHelper';
import utility from '../../../utility';

const FORMS_API_ENDPOINT = '/form';
const LOCATIONS_API_ENDPOINT = '/location';
const ENCOUNTER_TYPES_API_ENDPOINT = '/encountertype';

class EncounterComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      locations: [],
      encouterTypes: [],
      forms: [],
      searchResults: [],
      currentPage: 1,
      toDisplay: [],
      totalPage: 0,
      perPage: 10,
      locationError: false,
      location: '',
      method: 'ANY',
      onOrBefore: '',
      onOrAfter: '',
      atLeastCount: '',
      atMostCount: '',
      selectedEncounterTypes: [],
      encounterLocation: '',
      encounterForm: ''
    };
    this.jsonHelper = new JSONHelper();
    this.searchByEncounter = this.searchByEncounter.bind(this);
    this.handleSelectOption = this.handleSelectOption.bind(this);
    this.searchByLocation = this.searchByLocation.bind(this);
    this.handleDateChange = this.handleDateChange.bind(this);
    this.getDateString = this.getDateString.bind(this);
    this.resetEncounterFields = this.resetEncounterFields.bind(this);
    this.resetLocationFields = this.resetLocationFields.bind(this);
    this.handleSelectEncounters = this.handleSelectEncounters.bind(this);
    this.handleCountChange = this.handleCountChange.bind(this);
    this.handleOnKeyPress = this.handleOnKeyPress.bind(this);
  }

  componentWillMount() {
    this.props.fetchData(FORMS_API_ENDPOINT)
      .then(response => {
        const displayData = [];
        response.results && response.results.map(result => {
          displayData.push({ id: result.uuid, value: result.display });
        });
        this.setState({ forms: displayData });
      });

    this.props.fetchData(LOCATIONS_API_ENDPOINT)
      .then(response => {
        const displayData = [];
        response.results && response.results.map(result => {
          displayData.push({ id: result.uuid, value: result.display });
        });
        this.setState({ locations: displayData });
      });

    this.props.fetchData(ENCOUNTER_TYPES_API_ENDPOINT)
      .then(response => {
        const displayData = [];
        response.results && response.results.map(result => {
          displayData.push({ id: result.uuid, value: result.display });
        });
        this.setState({ encouterTypes: displayData });
      });
  }

  displaySelectOption(data) {
    return (
      <option value={data.id} key={shortId.generate()}>{data.value}</option>
    );
  }

  removeEmptyValues(allParameters) {
    const newParamArray = [];
    allParameters.encounterSearchAdvanced.forEach(eachParam => {
      if (!(!eachParam.value || (Array.isArray(eachParam.value) && eachParam.value[0] === ''))) {
        newParamArray.push(eachParam);
      }
    });

    const newObject = {};
    newObject.encounterSearchAdvanced = newParamArray;
    return newObject;
  }

  searchByEncounter(event) {
    event.preventDefault();
    const {
      selectedEncounterTypes, encounterLocation, encounterForm,
      atLeastCount, atMostCount, onOrAfter, onOrBefore
    } = this.state;
    const searchParams = { encounterSearchAdvanced: [] };
    if (onOrAfter) {
      searchParams.encounterSearchAdvanced.push({
        name: 'onOrAfter', value: onOrAfter
      });
    }
    if (atLeastCount) {
      searchParams.encounterSearchAdvanced.push({
        name: 'atLeastCount', value: atLeastCount
      });
    }
    if (atMostCount) {
      searchParams.encounterSearchAdvanced.push({
        name: 'atMostCount', value: atMostCount
      });
    }
    if (encounterForm) {
      searchParams.encounterSearchAdvanced.push({
        name: 'formList', value: [encounterForm]
      });
    }
    if (encounterLocation) {
      searchParams.encounterSearchAdvanced.push({
        name: 'locationList', value: [encounterLocation]
      });
    }
    if (onOrBefore) {
      searchParams.encounterSearchAdvanced.push({
        name: 'onOrBefore', value: onOrBefore
      });
    }
    if (selectedEncounterTypes.length > 0) {
      searchParams.encounterSearchAdvanced.push({
        name: 'encounterTypeList',
        value: selectedEncounterTypes.map(encounter => encounter.value)
      });
    }

    const label = this.getEncounterSearchDescription();
    const queryDetails = this.jsonHelper.composeJson(searchParams);
    utility.notifications('info', 'Loading...', {showDuration: 0, timeOut: 10});
    this.props.search(queryDetails, label).then(results => {
      const allEncounterTypes = results.rows || [];
      if (JSON.stringify(allEncounterTypes) === JSON.stringify([])) {
        utility.notifications('info', 'Search completed successfully but no results found');
      } else {
        utility.notifications('success', 'Search completed successfully');
      }
      this.props.addToHistory(label, allEncounterTypes, results.query);
    }).catch((error) => utility.notifications('error', 'Search error, check the server log for details'));
    this.resetEncounterFields();
  }

  handleSelectEncounters(selectedEncounterTypes) {
    this.setState({ selectedEncounterTypes });
  }

  /**
   * Composes the right description for every encounter search
   * that is performed using search parameters in state
   * @return {string} the encounter search description
   */
  getEncounterSearchDescription() {
    let label = 'Patients with Encounter of';
    const {
      selectedEncounterTypes, encounterLocation, encounterForm,
      locations, forms, atLeastCount, atMostCount, onOrAfter, onOrBefore
    } = this.state;
    const selectedEncounters = selectedEncounterTypes
      .map(encounter => encounter.label)
      .join(', ')
      .replace(/,(?=[^,]*$)/, ' and ');
      
    label += selectedEncounters ?
    ` Type${selectedEncounters.length > 1 ? 's' : ''} ${selectedEncounters}`
    : ' any Type';
    if (encounterLocation) {
      label += ` at ${locations.find(location => location.id === encounterLocation).value}`;
    }
    if (encounterForm) {
      label += ` from ${forms.find( form => form.id === encounterForm).value}`;
    }
    if (atLeastCount) {
      label += ` at least ${atLeastCount} ${atLeastCount > 1 ? 'times' : 'time'}`;
    }
    if (atMostCount) {
      label += ` ${atLeastCount ? ' and' : ''} at most ${atMostCount} ${atMostCount > 1 ? 'times' : 'time'}`;
    }
    if (onOrAfter) {
      if (onOrBefore) {
        label += ` from ${onOrAfter}`;
      } else {
        label += ` on or after ${onOrAfter}`;
      }
    }
    if (onOrBefore) {
      if (onOrAfter) {
        label += ` to ${onOrBefore}`;
      } else {
        label += ` on or before ${onOrBefore}`;
      }
    }
    return label;
  }

  /**
   * Generates a location search description based on the search values
   */
  getLocationSearchDescription() {
    const selectedLocation = this.state.locations.find((item) => {
      return item.id === this.state.location;
    });
    let searchDescription = `Patients in ${selectedLocation.value}`;
    switch (this.state.method) {
      case 'FIRST':
        searchDescription += ' (by method EARLIEST_ENCOUNTER).';
        break;
      case 'LAST':
        searchDescription += ' (by method LATEST_ENCOUNTER).';
        break;
      default:
        searchDescription += ' (by method ANY_ENCOUNTER).';
        break;
    }
    return searchDescription;
  }

  searchByLocation(event) {
    event.preventDefault();
    const { location, method } = this.state;
    if (!location) {
      return this.setState({ locationError: true });
    }
    const searchParameter = {
      encounterSearchAdvanced: [
        { name: 'locationList', value: [location] },
        { name: 'timeQualifier', value: method },
      ]
    };
    const queryDetails = this.jsonHelper.composeJson(searchParameter);
    utility.notifications('info', 'Loading...', {showDuration: 0, timeOut: 10});
    this.props.search(queryDetails, this.getLocationSearchDescription()).then(results => {
      const allEncounterTypes = results.rows || [];
      if (JSON.stringify(allEncounterTypes) === JSON.stringify([])) {
        utility.notifications('info', 'Search completed successfully but no results found');
      } else {
        utility.notifications('success', 'Search completed successfully');
      }
      this.props.addToHistory(this.getLocationSearchDescription(), allEncounterTypes, results.query);
      this.resetLocationFields();
    }).catch(() => utility.notifications('error', 'Search error, check the server log for details'));
  }

  /**
   * Sets the selected option value to the property in state
   * (referred to by the option id)
   * @param {Object} event - Object contatining data about the triggered event
   * @return {Object} new state
   */
  handleSelectOption(event) {
    event.preventDefault();
    this.setState({ [event.target.id]: event.target.value });
    // Remove location selection warning
    if (event.target.id === 'location') {
      this.setState({ locationError: false });
    }
  }

  /**
   * Gets an array of <option> element items from locations in the state
   * @return {Array} - An array containing option elements of availaible methods
   */
  getLocationOptions() {
    return this.state.locations.map((item) => {
      return <option value={item.id} key={shortId.generate()}>{item.value}</option>;
    });
  }

  /**
   * Gets an array of <option> element items from methods in the state
   * @return {Array} - An array containing option elements of availaible methods
   */
  getMethodOptions() {
    return [
      <option key={shortId.generate()} value={'ANY'}>Any Encounter</option>,
      <option key={shortId.generate()} value={'LAST'}>Most Recent Encounter</option>,
      <option key={shortId.generate()} value={'FIRST'}>Earliest Encounter</option>
    ];
  }

  /**
   * Updates the date key for different date types in the state
   * @param {String} stateKey - The key in the component state that should be
   * updated
   * @return {Function} - Call back function to be executed by the date input
   * field
   */
  handleDateChange(stateKey) {
    return value => this.setState({
      [stateKey]: this.getDateString(value)
    });
  }

  /**
   * Gets the date in the format MM-DD-YY from a date isoString
   * @param {String} isoString - Date in isoString format
   * @return {String} MM-DD-YY date formatted string
   */
  getDateString(isoString) {
    return isoString ? isoString.split('T')[0] : '';
  }

  /**
   * Sets the encounter count 
   * @param {Object} event - Event Object
   * @return {undefined} 
   */
  handleCountChange(event) {
    this.setState({ [event.target.id]: event.target.value });
  }

  handleOnKeyPress(event){
    if (typeof event.key === 'boolean' || isNaN(event.key)) {
      event.preventDefault();
    } 
  }

  handleValidateCountInput(event) {
    const invalidCharacters = [
      '-',
      '+',
      'e'
    ];

    (invalidCharacters.includes(event.key)) ? event.preventDefault() : null;
  }

  resetEncounterFields() {
    this.setState({
      onOrBefore: '',
      onOrAfter: '',
      selectedEncounterTypes: [],
      encounterForm: '',
      encounterLocation: '',
      atLeastCount: '',
      atMostCount: ''
    });
  }

  resetLocationFields() {
    this.setState({
      location: '',
      method: 'ANY',
      locationError: false
    });
  }

  render() {
    return (
      <div className="encounter-component">
        <form className="form-horizontal text-center" id="encounter-search">
          <fieldset className="scheduler-border">
            <legend className="scheduler-border">Search By Encounter</legend>
            <h4 className="text-center">Patients having encounters</h4>
            <div className="form-group">
              <label htmlFor="type" className="col-sm-2 control-label">
                Of Type
              </label>
              <div className="col-sm-6">
                <Select
                  multi
                  joinValues
                  placeholder="Select Encounter Type"
                  value={this.state.selectedEncounterTypes}
                  options={this.state.encouterTypes.map(d => { return { value: d.id, label: d.value }; })}
                  onChange={this.handleSelectEncounters}
                />
              </div>
              <span className="inline-label">(Leave blank for all encounter types)</span>
            </div>

            <div className="form-group">
              <label htmlFor="locations" className="col-sm-2 control-label">At Location:</label>
              <div className="col-sm-3">
                <select className="form-control" id="encounterLocation" value={this.state.encounterLocation} onChange={this.handleSelectOption}>
                  <option value="">--Select Location--</option>
                  {this.state.locations.map(location => this.displaySelectOption(location))}
                </select>
              </div>
              <span className="inline-label">(Optional)</span>

              <label htmlFor="formList" className="col-sm-2 control-label">From Form:</label>
              <div className="col-sm-3">
                <select className="form-control" id="encounterForm" value={this.state.encounterForm} onChange={this.handleSelectOption}>
                  <option value="">--Select Form--</option>
                  {this.state.forms.map(form => this.displaySelectOption(form))}
                </select>
              </div>
              <span className="inline-label">(Optional)</span>
            </div>

            <div className="form-group">
              <label htmlFor="atLeast" className="col-sm-2 control-label">Atleast this many: </label>
              <div className="col-sm-3">
                <input 
                  min="0" 
                  type="number" 
                  pattern="[0-9]*" 
                  className="form-control" 
                  id="atLeastCount" 
                  value={this.state.atLeastCount} 
                  onKeyDown={this.handleValidateCountInput} 
                  onChange={this.handleCountChange} 
                  onKeyPress={this.handleOnKeyPress}
                />
              </div>
              <span className="inline-label">(Optional)</span>
              <label htmlFor="atMost" className="col-sm-2 control-label">Upto this many: </label>
              <div className="col-sm-3">
                <input 
                  min="0" 
                  type="number" 
                  className="form-control" 
                  id="atMostCount" 
                  value={this.state.atMostCount} 
                  onKeyDown={this.handleValidateCountInput} 
                  onChange={this.handleCountChange} 
                  onKeyPress={this.handleOnKeyPress}
                />
              </div>
              <span className="inline-label">(Optional)</span>
            </div>

            <div className="form-group">
              <label htmlFor="startDate" className="col-sm-2 control-label">From: </label>
              <div className="col-sm-3">
                <DatePicker
                  id="onOrAfter"
                  className="form-control"
                  dateFormat="DD-MM-YYYY"
                  value={this.state.onOrAfter}
                  onChange={this.handleDateChange('onOrAfter')}
                />
              </div>
              <span className="inline-label">(Optional)</span>
              <label htmlFor="endDate" className="col-sm-2 control-label">To: </label>
              <div className="col-sm-3">
                <DatePicker
                  id="onOrBefore"
                  className="form-control"
                  dateFormat="DD-MM-YYYY"
                  value={this.state.onOrBefore}
                  onChange={this.handleDateChange('onOrBefore')}
                />
              </div>
              <span className="inline-label">(Optional)</span>
            </div>

            <div className="form-group submit-btn">
              <div className="col-sm-offset-2 col-sm-6">
                <button type="submit" className="btn btn-success" onClick={this.searchByEncounter}>Search</button>
                <button type="reset" onClick={this.resetEncounterFields} className="btn btn-default cancelBtn">Reset</button>
              </div>
            </div>
          </fieldset>
        </form>

        <form id="search-by-location" className="form-horizontal">
          <fieldset className="scheduler-border">
            <legend className="scheduler-border">Search By Location</legend>
            <div className={`form-group ${this.state.locationError ? "has-error" : ""}`}>
              <label htmlFor="location" className="col-sm-2 control-label">Patients belonging to?:</label>
              <div className="col-sm-6">
                <select className="form-control" id="location" onChange={this.handleSelectOption} value={this.state.location}>
                  <option value="">--Select Location--</option>
                  {this.getLocationOptions()}
                </select>
              </div>
              <span className="inline-label">(Required)</span>
            </div>

            <div className="form-group">
              <label htmlFor="gender" className="col-sm-2 control-label">According to Method:</label>
              <div className="col-sm-6">
                <select className="form-control" id="method" onChange={this.handleSelectOption} value={this.state.method}>
                  {this.getMethodOptions()}
                </select>
              </div>
            </div>

            <div className="form-group">
              <div className="col-sm-offset-2 col-sm-6">
                <button type="submit" className="btn btn-success" onClick={this.searchByLocation}>Search</button>
                <button type="reset" onClick={this.resetLocationFields} className="btn btn-default cancelBtn">Reset</button>
              </div>
            </div>
          </fieldset>
        </form>
      </div>
    );
  }
}

EncounterComponent.propTypes = {
  fetchData: PropTypes.func.isRequired,
  search: PropTypes.func.isRequired,
  addToHistory: PropTypes.func.isRequired
};

export default EncounterComponent;
