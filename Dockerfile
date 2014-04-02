# Afra
# This builds a Docker image to create containers that run the Afra project (afra.sbcs.qmul.ac.uk)
#
# VERSION   0.0.1

FROM        bmpvieira/afra-environment
MAINTAINER  Bruno Vieira <mail@bmpvieira.com>

USER root
ADD . /afra
WORKDIR /afra
RUN ./scripts/build.sh
ENTRYPOINT ["./scripts/run.sh"]
