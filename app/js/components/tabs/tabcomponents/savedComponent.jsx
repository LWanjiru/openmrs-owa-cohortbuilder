/*
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/. OpenMRS is also distributed under
 * the terms of the Healthcare Disclaimer located at http://openmrs.org/license.
 *
 * Copyright (C) OpenMRS Inc. OpenMRS is a registered trademark and the OpenMRS
 * graphic logo is a trademark of OpenMRS Inc.
 */

import React, { PropTypes } from 'react';
import SavedResultsTable from '../../common/savedResultsTable';
import { ApiHelper } from '../../../helpers/apiHelper';
import DownloadHelper from '../../../helpers/downloadHelper';
import utility from '../../../utility';

class SavedComponent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      cohortsQuery: '',
      cohortResults: [],
      searchingCohorts: false,
      inSearchCohortMode: false,
      cohortDownloadJobs: [],
      cohortDeleteJobs: [],
      definitionsQuery: '',
      definitionResults: [],
      searchingDefinitions: false,
      inSearchDefinitionMode: false,
      definitionDownloadJobs: [],
      definitionDeleteJobs: [],
      isDeleteDefinition: false,
      isDeleteCohort: false,
    };

    this.searchSavedCohorts = this.searchSavedCohorts.bind(this);
    this.deleteCohort = this.deleteCohort.bind(this);
    this.downloadCohort = this.downloadCohort.bind(this);
    this.viewCohort = this.viewCohort.bind(this);
    this.searchSavedDefinitions = this.searchSavedDefinitions.bind(this);
    this.deleteDefinition = this.deleteDefinition.bind(this);
    this.viewDefinition = this.viewDefinition.bind(this);
    this.downloadDefinition = this.downloadDefinition.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleReset = this.handleReset.bind(this);
  }

  /**
   * Deletes a cohort specified by it's uuid.
   * @param {String} uuid - unique identifier for the cohort to be deleted
   * @return {Function} - function that performs the actual deletion process
   */
  deleteCohort(uuid, cohortName) {
    return (event) => {
      event.preventDefault();
      const deleteJobs = [...this.state.cohortDeleteJobs];
      if (!deleteJobs.includes(uuid)) {
        let confirmResult = confirm(`Are you sure you want to delete this ${cohortName} cohort?`);
        if(confirmResult){
          deleteJobs.push(uuid);         
          this.setState({ cohortDeleteJobs: deleteJobs });
          new ApiHelper().delete(`/cohort/${uuid}?purge=true`)
            .then(() => {
              if (this.state.inSearchCohortMode) {
                this.setState({isDeleteCohort: true});
                this.searchSavedCohorts();
              }
            });
        }
      }
    };
  }

  /**
   * Download patients in a cohort to CSV format
   * @param {String} uuid - Unique identifier of the cohort to be downloaded 
   * @param {String} name - name of the cohort to be used as the name of the
   * CSV file
   * @return {Function} - function that performs the actual download process
   */
  downloadCohort(uuid, name) {
    return (event) => {
      event.preventDefault();
      const downloadJobs = [...this.state.cohortDownloadJobs];
      if (!downloadJobs.includes(uuid)) {
        downloadJobs.push(uuid);
        this.setState({ cohortDownloadJobs: downloadJobs });
        new ApiHelper().get(`/cohort/${uuid}/member`)
        .then((response) => {
          const patients = response.results.map(result => {
            const patient = result.patient.person;
            return {
              full_name: patient.preferredName ?
                patient.preferredName.display : 'Unknown Name',
              age: patient.age,
              gender: patient.gender
            };
          });
          DownloadHelper.downloadCSV(patients, name);
          const newDownloadJobs = [...this.state.cohortDownloadJobs];
          const jobsUpdate = newDownloadJobs.splice(
            newDownloadJobs.indexOf(uuid), 0);
          this.setState({
            cohortDownloadJobs: jobsUpdate
          });
        });
      }
    };
  }

  /**
   * Shows the list of patients in a cohort
   * @param {String} uuid - selected cohort UUID
   * @return {Object} List of patiends and their details
   */
  viewCohort(uuid, description) {
    const apiHelper = new ApiHelper();
    return () => {
      apiHelper.get(`/cohort/${uuid}/member?v=full`)
        .then((res) => {
          res.rows = res.results.map(data => {
            return {
              name:  data.patient.person.display,
              gender: data.patient.person.gender,
              age: data.patient.person.age
            };
          });
          this.props.getHistory(res, description);
        });
    };
  }

  /**
   * Deletes a query specified by it's uuid.
   * @param {String} uuid - unique identifier for the query to be deleted
   * @return {Function} - function that performs the actual deletion process
   */
  deleteDefinition(uuid, definitionName) {
    return (event) => {
      event.preventDefault();
      const deleteJobs = [...this.state.definitionDeleteJobs];
      if (!deleteJobs.includes(uuid)) {
        let confirmResult = confirm(`Do you want to delete this ${definitionName} definition?`);
        if(confirmResult){
          deleteJobs.push(uuid);
          this.setState({ definitionDeleteJobs: deleteJobs });
          new ApiHelper().delete(`reportingrest/adhocdataset/${uuid}?purge=true`)
            .then(() => {
              if (this.state.inSearchDefinitionMode) {
                this.setState({isDeleteDefinition: true});
                this.searchSavedDefinitions();
              }
            }
          );
        }
      }
    };
  }

  /**
   * Downloads patients in a query to CSV format
   * @param {String} uuid - Unique identifier of the query to be downloaded 
   * @param {String} name - name of the query to be used as the name of the
   * CSV file
   * @return {Function} - function that performs the actual download process
   */
  downloadDefinition(uuid, name) {
    return (event) => {
      event.preventDefault();
      const downloadJobs = [...this.state.definitionDownloadJobs];
      if (!downloadJobs.includes(uuid)) {
        downloadJobs.push(uuid);
        this.setState({ definitionDownloadJobs: downloadJobs });
        new ApiHelper().get(`reportingrest/dataSet/${uuid}`)
        .then((response) => {
          const patients = response.rows.map(patient => {
            return {
              full_name: `${patient.firstname} ${patient.lastname}`,
              age: patient.age,
              gender: patient.gender
            };
          });
          DownloadHelper.downloadCSV(patients, name);
          const newDownloadJobs = [...this.state.definitionDownloadJobs];
          const jobsUpdate = newDownloadJobs.splice(
            newDownloadJobs.indexOf(uuid), 0);
          this.setState({
            definitionDownloadJobs: jobsUpdate
          });
        });
      }
    };
  }

  /**
   * Lists all users in a selected definition query
   * @param {String} uuid - Selected definition query uuid
   * @return {Object} List of all users
   */
  viewDefinition(uuid, description) {
    const apiHelper = new ApiHelper();
    return () => {
      apiHelper.get(`reportingrest/dataSet/${uuid}`)
        .then((res) => {
          this.props.getHistory(res, description);
        });
    };
  }

  /**
   * Searches for saved cohorts and updates the state
   * @param {Object} event - Object containing details of this event
   * @return {Object} new state
   */
  searchSavedCohorts(event) {
    event ? event.preventDefault() : null;
    if(!this.state.searchingCohorts && this.state.cohortsQuery.trim()) {
      this.setState({ searchingCohorts: true, inSearchCohortMode: true });
      utility.notifications('info', 'Loading...', {showDuration: 0, timeOut: 10});
      new ApiHelper().get(`/cohort?v=full&q=${this.state.cohortsQuery}`)
      .then(response => {
        if (JSON.stringify(response.results) === JSON.stringify([]) && !this.state.isDeleteCohort) {
          utility.notifications('info', 'Search completed successfully but no results found');
        } else if (this.state.isDeleteCohort) {
          utility.notifications('error', 'Cohort deleted successfully');
        } else {
          utility.notifications('success', 'Search completed successfully');
        }
        this.setState({
          isDeleteCohort: false,
          searchingCohorts: false,
          cohortResults: response.results.map(result => {
            return { 
              name: result.display,
              description: result.description,
              totalResults: result.memberIds.length,
              uuid: result.uuid
            };
          })
        });
      }).catch(() => utility.notifications('error', 'Search error, check the server log for details'));
      this.handleReset();
    } else {
      utility.notifications('warning', 'Please enter a value to search!', {showDuration: 0, timeOut: 10});
    }
  }

  searchSavedDefinitions(event) {
    event ? event.preventDefault() : null;
    if(!this.state.searchingDefinitions && this.state.definitionsQuery.trim()) {
      this.setState({
        searchingDefinitions: true, inSearchDefinitionMode: true
      });
      utility.notifications('info', 'Loading...', {showDuration: 0, timeOut: 10});
      new ApiHelper()
      .get(
        `reportingrest/dataSetDefinition?v=full&q=${this.state.definitionsQuery}`
      )
      .then(response => {
        if (JSON.stringify(response.results) === JSON.stringify([]) && !this.state.isDeleteDefinition) {
          utility.notifications('info', 'Search completed successfully but no results found');
        } else if (this.state.isDeleteDefinition) {
          utility.notifications('error', 'Definition deleted successfully');
        } else {
          utility.notifications('success', 'Search completed successfully');
        }
        this.setState({
          isDeleteDefinition: false,
          searchingDefinitions: false,
          definitionResults: response.results.map(result => {
            return {
              name: result.name.replace(/\[AdHocDataExport\] /, ''),
              description: result.description,
              uuid: result.uuid
            };
          })
        });
      }).catch(() => utility.notifications('error', 'Search error, check the server log for details'));
      this.handleReset();
    } else {
      utility.notifications('warning', 'Please enter a value to search', {showDuration: 0, timeOut: 10});
    }
  }

  /**
   * Handles changes on text input elements in this component
   * @param {Object} event  - Object containing details of this event
   * @return {Object} new state
   */
  handleInputChange(event) {
    this.setState({ [event.target.id]: event.target.value });
    if(!event.target.value.trim()) {
      if (event.target.id === 'definitionsQuery' ) {
        this.setState({
          definitionResults: [],
          inSearchDefinitionMode: false
        });
      }
      if (event.target.id === 'cohortsQuery') {
        this.setState({
          cohortResults: [],
          inSearchCohortMode: false
        });
      }
    }
  }

  handleReset() {
    this.setState({
      cohortsQuery: '',
      cohortResults: [],
      searchingCohorts: false,
      inSearchCohortMode: false,
      cohortDownloadJobs: [],
      cohortDeleteJobs: [],
      definitionsQuery: '',
      definitionResults: [],
      searchingDefinitions: false,
      inSearchDefinitionMode: false,
      definitionDownloadJobs: [],
      definitionDeleteJobs: [],
      isDeleteDefinition: false,
      isDeleteCohort: false,
    });
  }

  render() {
    return (
      <div className="saved-component">
        <form className="form-horizontal"
          id="search-saved-cohort"
        >
          <fieldset className="scheduler-border">
            <legend className="scheduler-border">Search Saved Query Definitions</legend>
            <i className="status-container">
              Query Definitions can be found on the third column on the Search History table below.
              You can only search for Query Definitions that you have saved using a Name.
            </i>
            <div className={'form-group'}>
              <label
                className="control-label col-sm-3"
                htmlFor="saved-cohort-query"
              >
                Saved Definitions:
              </label>
              <div className="col-sm-6 input-group">
                <input
                  id="definitionsQuery"
                  type="text"
                  onChange={this.handleInputChange}
                  value={this.state.definitionsQuery}
                  disabled={this.state.searchingDefinitions ? 'disabled' : null}
                  className="form-control"
                  placeholder="Enter Query Name . . ."
                />
                <span
                  className="input-group-btn">
                  <button
                    className="btn btn-success"
                    disabled={this.state.searchingDefinitions ? 'disabled' : null}
                    onClick={this.searchSavedDefinitions}
                  >
                    Search
                  </button>
                </span>
              </div>
            </div>
          </fieldset>
        </form>

        <SavedResultsTable
          onDelete={this.deleteDefinition}
          onView={this.viewDefinition}
          onDownload={this.downloadDefinition}
          deleteJobs={this.state.definitionDeleteJobs}
          downloadJobs={this.state.definitionDownloadJobs}
          results={this.state.definitionResults}
          isSearching={this.state.searchingDefinitions}
          tableName={this.state.inSearchDefinitionMode ? 'Definition Search Results' : ''}
        />

        <form 
          className="form-horizontal" 
          id="search-saved-cohort"
          onSubmit={this.searchSavedCohorts}
        >
          <fieldset className="scheduler-border">
            <legend className="scheduler-border">Search Saved Cohort Definitions</legend>
            <i className="status-container">
              Cohort Definitions can be found on the last column on the Search History table below.
              You can only search for Cohort Definitions that you have saved using a Name.
            </i>
            <div className="form-group">
              <label
                className="control-label col-sm-3"
                htmlFor="saved-cohort-query"
              >
                Saved Cohorts:
              </label>
              <div className="col-sm-6 input-group">
                <input
                  id="cohortsQuery"
                  type="text"
                  value={this.state.cohortsQuery}
                  disabled={this.state.searchingCohorts ? 'disabled' : null}
                  className="form-control"
                  placeholder="Enter Cohort Name . . ." 
                  onChange={this.handleInputChange}
                />
                <span
                  className="input-group-btn">
                  <button
                    className="btn btn-success"
                    disabled={this.state.searchingCohorts ? 'disabled' : null}
                    onClick={this.searchSavedCohorts}
                  >
                    Search
                  </button>
                </span>
              </div>
            </div>
          </fieldset>
        </form>
        <SavedResultsTable
          onDelete={this.deleteCohort}
          onDownload={this.downloadCohort}
          onView={this.viewCohort}
          deleteJobs={this.state.cohortDeleteJobs}
          downloadJobs={this.state.cohortDownloadJobs}
          results={this.state.cohortResults}
          isSearching={this.state.searchingCohorts}
          tableName={this.state.inSearchCohortMode ? 'Cohort Search Results' : ''}
        />
      </div>
    );
  }
}

SavedComponent.propTypes = {
  getHistory: PropTypes.func
};

export default SavedComponent;
