import $ from 'jquery';

import React from 'react';
import {render} from 'react-dom';
import {Router, Route, Link, browserHistory} from 'react-router';

import About from './about';
import Dashboard from './dashboard';
import Curate from './curate';

class Afra extends React.Component {
    constructor() {
        super();
        this.state = { user: null };
    }

    componentDidMount() {
        $.getJSON('/whoami', (user) => this.setState({ user: user }));
    }

    render() {
        return this.state.user ? <Dashboard user={this.state.user}/> : <About/>;
    }
}

render((
    <Router history={browserHistory}>
        <Route path="/" component={Afra}>
            <Route path="about" component={About}/>
            <Route path="curate" component={Curate}/>
        </Route>
    </Router>
), document.getElementById("view"));
