# To run Afra.
#
# [1]: https://github.com/yeban/afra
# [2]: http://afra.sbcs.qmul.ac.uk
#
# VERSION   0.0.1

FROM        bmpvieira/afra-environment
MAINTAINER  Anurag Priyam <anurag08priyam@gmail.com>

USER root
ADD . /afra
WORKDIR /afra
RUN ./scripts/build.sh
ENTRYPOINT ["./scripts/run.sh"]
