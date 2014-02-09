=head1 NAME

JBlibs - when included, sets JBrowse Perl module paths

=cut

package JBlibs;

use Carp::Heavy; #< work around some types of broken perl installations

#find the jbrowse root dir
use File::Basename 'dirname';
my $dir = dirname($INC{'JBlibs.pm'}) or die;
my $extlib = "$dir/.extlib";

require lib;

if( -e $extlib ) {
    lib->import( "$extlib/lib/perl5" );
}

1;
