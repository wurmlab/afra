import React from 'react';
import moment from 'moment';

export default class About extends React.Component {
    constructor(props) {
        super(props);
        //console.log(this.props.user.joined_on);
        //console.log(moment(this.props.user.joined_on, 'MMMM Do, YYYY'));
    }

    render () {
        return (
            <article className="container dashboard">
                <div className="row">
                    <div className="col-md-3">
                        <a href='#' className="thumbnail">
                            <img
                                src={this.props.user.picture}
                                height="220" width="260"
                                alt="Profile pic"/>
                        </a>
                        <h3>
                            {this.props.user.name}
                            <br/>
                            <small>
                                beginner
                            </small>
                        </h3>
                        <p>
                            <i className="fa fa-clock-o"></i> Started 
                        </p>
                        <p>
                            <a
                                href="mailto:a.priyam@qmul.ac.uk?subject=[afra] curation certificate"
                                target="_blank" title="Emails admin. You must have contributed 100hrs.">
                                <i className="fa fa-fw fa-certificate"></i>
                                Request Curation Certificate.
                            </a>
                            <br/>
                            <a
                                href="mailto:a.priyam@qmul.ac.uk?subject=[afra] associate curator status"
                                target="_blank" title="Emails admin. You must have contributed 100hrs.">
                                <i className="fa fa-fw fa-graduation-cap"></i>
                                Request Associate Curator Status.
                            </a>
                        </p>
                    </div>

                    <div className="col-md-9 details">
                        <h3>Welcome</h3>
                        <div
                            className="panel panel-default panel-introduction">
                            <div
                                className="panel-body">
                                Manual curation is critical before predicted genes can be used in
                                research. Manual curation can be a bit daunting though. Following
                                guide should help you get started:
                                <ol>
                                    <li>
                                        <a
                                            href="http://afra.sbcs.qmul.ac.uk:8080/t/overview-of-the-curation-interface/14"
                                            target="_blank">
                                            Overview of the curation interface.
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="http://afra.sbcs.qmul.ac.uk:8080/t/step-1-determining-whether-your-gene-model-needs-curation-improvement/16"
                                            target="_blank">
                                            Determining whether gene model needs improvement.
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="http://afra.sbcs.qmul.ac.uk:8080/t/curating-gene-models/19"
                                            target="_blank">
                                            Performing curation.
                                        </a>
                                    </li>
                                </ol>
                                If you think there is something we have missed out, just ask:
                                <a
                                    href="http://afra.sbcs.qmul.ac.uk:8080">
                                    Help &amp; Support
                                </a>.
                            </div>
                        </div>

                        <h3>Practise</h3>
                        <div
                            className="panel panel-default panel-introduction">
                            <div
                                className="panel-body">
                                <div
                                    className="media">
                                    <div
                                        className="media-object-like text-center pull-left"
                                        style={{width: "128px", height: "90px"}}>
                                        <i className="fa fa-5x fa-book"></i>
                                    </div>
                                    <div
                                        className="media-body">
                                        <p
                                            className="justified">
                                            <strong>Practise</strong>  and
                                            learn. These won't impact your
                                            score.
                                            <br/>
                                            <i className="fa fa-long-arrow-right"></i>
                                            <a
                                                href="curate?id=4834">
                                                Non-canonical translation start.
                                            </a>
                                            <br/>
                                            <i className="fa fa-long-arrow-right"></i>
                                            <a
                                                href="curate?id=4980">
                                                Missing exon.
                                            </a>
                                            <br/>
                                            <i className="fa fa-long-arrow-right"></i>
                                            <a
                                                href="curate?id=2032">
                                                Split.
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h3>Test</h3>
                        <div
                            className="panel panel-default panel-introduction">
                            <div
                                className="panel-body">
                                <div
                                    className="media">
                                    <div
                                        className="media-object-like text-center pull-left"
                                        style={{width: "128px", height: "90px"}}>
                                        <i className="fa fa-5x fa-check-square-o"></i>
                                    </div>
                                    <div
                                        className="media-body">
                                        <p
                                            className="justified">
                                            <strong>Test</strong> what you have
                                            learnt.
                                            <br/>
                                            <i className="fa fa-long-arrow-right"></i>
                                            <a
                                                href="curate?id=7175">
                                                maker-Si_gnH.scaffold00108-snap-gene-2.59-mRNA-1.
                                            </a>
                                            <br/>
                                            <i className="fa fa-long-arrow-right"></i>
                                            <a
                                                href="curate?id=4891">
                                                maker-Si_gnH.scaffold00039-snap-gene-13.33-mRNA-1.
                                            </a>
                                            <br/>
                                            <i className="fa fa-long-arrow-right"></i>
                                            <a
                                                href="curate?id=7172">
                                                maker-Si_gnH.scaffold00108-augustus-gene-2.52-mRNA-1 &
                                                maker-Si_gnH.scaffold00108-snap-gene-2.57-mRNA-1.
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h3>Curation challenges</h3>
                        <div
                            className="panel panel-default panel-challenges">
                            <div
                                className="panel-body">
                                <div
                                    className="media">
                                    <div
                                        className="media-left">
                                        <img
                                            src="img/S_invicta.jpg"
                                            height="96" width="128"
                                            alt="Solenopsis invicta"/>
                                        <p
                                            className="media-object-attribution">
                                            © <a href="http://www.alexanderwild.com/">Alex Wild</a>
                                        </p>
                                    </div>
                                    <div
                                        className="media-body">
                                        <p
                                            className="justified">
                                            The <strong>fire ant</strong> (<em>Solenopsis invicta</em>) is an
                                            aggressive and invasive species with a painful sting, annually
                                            costing more than $5 billion in the USA.
                                        </p>
                                        <p
                                            className="justified">
                                            The fire ant genome was 
                                            <a href='http://yannick.poulet.org/publications/wurm2011fireAntGenome.pdf'>
                                                sequenced in 2011</a>, enabling researchers to identify
                                            unique genomic features linked to the complex social behaviors
                                            of this species. Improved gene predictions will greatly facilitate
                                            such research.
                                        </p>
                                        <a
                                            href="curate"
                                            className="btn btn-primary pull-right">
                                            Curate
                                            <i className="fa fa-lg fa-angle-right"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </article>
        );
    }
}


                        //<h3>Contribution activity</h3>
                        //<div
                            //ng-if="!has_contributions()">
                            //<ul
                                //className="list-group">
                                //<li
                                    //className="list-group-item">
                                    //<p className="list-group-item-text">
                                        //<span
                                            //className="label label-success">
                                        //</span>
                                        //&nbsp;&nbsp;
                                        //Pick a challenge above and start contributing!
                                    //</p>
                                //</li>
                            //</ul>
                        //</div>
                        //<ul
                            //className="list-group">
                            //<li
                                //ng-repeat="contribution in contributions | orderBy:'-made_on'"
                                //className="list-group-item">
                                //<p className="list-group-item-text">
                                    //<span
                                        //className="label label-primary">
                                        //{{contribution.status}}
                                    //</span>
                                    //&nbsp;&nbsp;
                                    //<a
                                        //href="curate?id={{contribution.task.id}}"
                                        //ng-bind-html="describe_contribution(contribution)">
                                    //</a>
                                    //<span
                                        //am-time-ago="contribution.made_on"
                                        //className="time pull-right">
                                    //</span>
                                //</p>
                            //</li>
                        //</ul>
                    //</div>
                //</div>

