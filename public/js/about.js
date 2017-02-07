//<ng-include src="'templates/_nav.html'"></ng-include>
//<ng-include src="'templates/_footer.html'"></ng-include>
//<ng-include src="'templates/_incompatible-browser-alert.html'"></ng-include>

import React from 'react';

export default class About extends React.Component {
    render () {
        return (
            <article className="container">
                <section className="problem">
                    <h3>Gene Annotation for the Masses</h3>
                    <p>
                        Why don't naked mole rats ever get cancer?  How can ant queens live
                        for up to 30 years while workers live for a few months and males for
                        only a few weeks?  What makes dog breeds so different?
                    </p>

                    <p>
                        Answering such questions requires understanding the relevant genomes.
                        The genome of an organism – stored in the form of DNA in each cell –
                        is represented as a long sequence of the letters ‘A’, ‘G’, ‘C’, and
                        ‘T’.  Parts of this sequence represent genes – instructions which
                        define the shape, size, behavior, lifespan and disease susceptibility
                        of the organism.
                    </p>

                    <p>
                        Obtaining a genome sequence is easy. But computers and biologists are
                        having hard time correctly identifying the genes it contains.
                    </p>
                </section>

                <div className="row">
                    <div className="col-md-6">
                        <section className="contributor">
                            <h3>Biologists Need Your Help.</h3>
                            <ul className="fa-ul the-deal">
                                <li>
                                    <i className="fa fa-li fa-lg fa-search"></i>Analyze and
                                    correct gene models guided by our smart interface.
                                </li>
                                <li>
                                    <i className="fa fa-li fa-lg fa-facebook-square"></i>Share your
                                    contribution to science with your peers.
                                </li>
                                <li>
                                    <i className="fa fa-li fa-lg fa-book"></i>Learn about genes
                                    and genomes.
                                </li>
                                <li>
                                    <i className="fa fa-li fa-lg fa-certificate"></i>Earn
                                    recognition and make the world a better place.
                                </li>
                            </ul>
                        </section>

                        <br/>
                        <br/>

                        <section className="biologist">
                            <h3>Are You a Biologist?</h3>
                            <ul className="fa-ul the-deal">
                                <li>
                                    <i className="fa fa-li fa-lg fa-group"></i>Sequenced a genome
                                    <em>de novo</em> but stuck with bad gene predictions? Our
                                    community can manually inspect and refine them for you.
                                </li>

                                <li>
                                    <i className="fa fa-li fa-lg fa-eye"></i>Performing
                                    research on a gene family but uncertain of the quality of gene
                                    models you have? Our community can verify and improve their
                                    quality for you.
                                </li>
                            </ul>
                        </section>
                    </div>

                    <div className="col-md-4 col-md-offset-2">
                        <div className="auth">
                            <div>
                                <a
                                    className="btn btn-primary btn-lg btn-block">
                                    <i className="fa fa-lg fa-facebook-square"></i>
                                    Login with Facebook
                                </a>
                                <br/>
                                <p
                                    className="login-error text-center"
                                    style={{color: 'red', display: 'none'}}>
                                    Couldn't log you in via Facebook.
                                </p>
                            </div>
                            <div>
                                <div className="form-group col-sm-12 login2">
                                    <input
                                        type="input" name="name" className="form-control"
                                        placeholder="Full name"/>
                                    <br/>
                                    <input
                                        type="input" name="email" className="form-control"
                                        placeholder="Email address"/>
                                    <br/>
                                    <a
                                        className="btn btn-primary btn-block">
                                        <i className="fa fa-sign-in"></i>
                                        Login
                                    </a>
                                </div>
                            </div>
                            <div>
                                <p
                                    className="text-justify">
                                    <strong>
                                        Update
                                    </strong>
                                    <br/>
                                    We have entred alpha stage and are using Afra in-house to curate
                                    fire ant genome. We are prepping for a release by November-end.
                                    <br/>
                                    <br/>
                                    Please email
                                    <a
                                        href="mailto:a.priyam@qmul.ac.uk">a.priyam@qmul.ac.uk
                                    </a>
                                    if you would like a demo or have questions.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <br/>
            </article>
        );
    }
}
