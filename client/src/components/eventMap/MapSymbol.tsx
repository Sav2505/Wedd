import LocalParkingIcon from '@mui/icons-material/LocalParking';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import ApartmentIcon from '@mui/icons-material/Apartment';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import WcIcon from '@mui/icons-material/Wc';
import AccessibleIcon from '@mui/icons-material/Accessible';
import ChildFriendlyIcon from '@mui/icons-material/ChildFriendly';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import PlaceIcon from '@mui/icons-material/Place';
import type { MapCategory } from '../../types/eventMap';

const symbols = {
  parking: LocalParkingIcon, entrance: MeetingRoomIcon, hall: ApartmentIcon, chuppah: FavoriteBorderIcon,
  toilets: WcIcon, accessibility: AccessibleIcon, nursing: ChildFriendlyIcon, quiet: VolumeOffIcon, general: PlaceIcon,
};
export default function MapSymbol({ category }: { category: MapCategory }) {
  const Symbol = symbols[category];
  return <Symbol fontSize="small" />;
}