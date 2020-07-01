import { connectModule } from 'ringcentral-widgets/lib/phoneContext';
import DialerPanel from '../../components/DialerPanel';

export default connectModule((phone) => phone.dialerUI)(DialerPanel);
