# To run Afra.
#
# [1]: https://github.com/yeban/afra
# [2]: http://afra.sbcs.qmul.ac.uk
#
# VERSION   0.0.1

FROM  debian:sid
MAINTAINER  Anurag Priyam <anurag08priyam@gmail.com>

RUN echo 'APT::Install-Recommends "false";' >> /etc/apt/apt.conf
RUN echo 'APT::Install-Suggests "false";' >> /etc/apt/apt.conf

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      apt-utils locales build-essential git curl openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# FIXME:
#   Added this line so that Postgres will be UTF-8 by default. However, it
#   doesn't seem to have any effect - Postgres has the default 'C' locale.
RUN localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8
ENV LANG en_US.utf8

## Setup Ruby.
RUN cd /tmp/ && \
      curl -o ruby-install-0.5.0.tar.gz -L https://github.com/postmodern/ruby-install/archive/v0.5.0.tar.gz && \
      tar xvf ruby-install-0.5.0.tar.gz && \
      cd ruby-install-0.5.0/ && \
      make install && \
    cd /tmp/ && \
      curl -o chruby-0.3.8.tar.gz -L https://github.com/postmodern/chruby/archive/v0.3.8.tar.gz && \
      tar xvf chruby-0.3.8.tar.gz && \
      cd chruby-0.3.8/ && \
      make install && \
    cd / && rm -rf /tmp/*

RUN apt-get update && \
    ruby-install ruby 2.1.4 -- --disable-install-rdoc && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

## Setup NodeJS and npm.
# FIXME:
#   This pulls in a lot of packages. Consider using pre-built binaries.
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      nodejs nodejs-legacy npm && \
    rm -rf /var/lib/apt/lists/*

## Setup Postgres.
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      postgresql postgresql-contrib postgresql-client libpq-dev \
      libexpat1-dev libperlio-gzip-perl && \
    rm -rf /var/lib/apt/lists/*

RUN /etc/init.d/postgresql start &&\
    su postgres -c "psql --command \"CREATE USER afra WITH SUPERUSER PASSWORD 'afra';\"" \
    && /etc/init.d/postgresql stop

COPY etc/postgresql/9.4/main/pg_hba.conf /etc/postgresql/9.4/main/

RUN chmod 644 /etc/postgresql/9.4/main/pg_hba.conf

## Setup Afra

RUN groupadd -r afra && useradd -m -g afra afra

COPY . /home/afra/src

RUN chown -R afra /home/afra/src/

WORKDIR /home/afra/src

RUN /etc/init.d/postgresql start && \
    su afra -s /bin/bash -c "source /usr/local/share/chruby/chruby.sh && chruby ruby-2.1.4 && /usr/local/src/ruby-2.1.4/bin/rake" && \
    /etc/init.d/postgresql stop

RUN /etc/init.d/postgresql start && \
    su afra -s /bin/bash -c "source /usr/local/share/chruby/chruby.sh && chruby ruby-2.1.4 && /usr/local/src/ruby-2.1.4/bin/rake import\[data/annotations/Solenopsis_invicta/Si_gnF.gff\]" && \
    /etc/init.d/postgresql stop

CMD /etc/init.d/postgresql start && su afra -s /bin/bash -c "source /usr/local/share/chruby/chruby.sh && chruby ruby-2.1.4 && /usr/local/src/ruby-2.1.4/bin/rake serve"
