import { Box, Typography } from '@mui/material';
import type { PersonCluster } from '../types/faceRecognition.types';
import PersonCard from './PersonCard';

interface PeopleListProps {
  people: PersonCluster[];
  onOpenPerson: (person: PersonCluster) => void;
}

export default function PeopleList({ people, onOpenPerson }: PeopleListProps) {
  if (people.length === 0) {
    return (
      <Box sx={{ mt: 1.25, p: 1.6, borderRadius: 2.2, background: 'rgba(255,255,255,0.6)' }}>
        <Typography sx={{ color: '#7A5C3A', fontSize: '0.83rem' }}>לא נמצאו אנשים סרוקים עדיין בגלריה.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1.25 }}>
      <Typography sx={{ fontWeight: 700, color: '#2C1810', mb: 0.8, fontSize: '0.96rem' }}>
        אנשים בתמונות
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
          gap: 0.75,
        }}
      >
        {people.map((person) => (
          <PersonCard key={person.id} person={person} onClick={onOpenPerson} />
        ))}
      </Box>
    </Box>
  );
}
