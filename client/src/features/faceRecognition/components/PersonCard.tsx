import { Box, ButtonBase, Typography } from '@mui/material';
import type { PersonCluster } from '../types/faceRecognition.types';

interface PersonCardProps {
    person: PersonCluster;
    onClick: (person: PersonCluster) => void;
}

export default function PersonCard({ person, onClick }: PersonCardProps) {
    const { representativeFace } = person;
    const sourceWidth = Math.max(representativeFace.sourceDimensions.width, 1);
    const sourceHeight = Math.max(representativeFace.sourceDimensions.height, 1);
    const centerX = representativeFace.boundingBox.x + representativeFace.boundingBox.width / 2;
    const centerY = representativeFace.boundingBox.y + representativeFace.boundingBox.height / 2;
    const posX = Math.min(100, Math.max(0, (centerX / sourceWidth) * 100));
    const posY = Math.min(100, Math.max(0, (centerY / sourceHeight) * 100));

    return (
        <ButtonBase
            onClick={() => onClick(person)}
            sx={{
                width: '100%',
                borderRadius: 1,
                p: 0.85,
                display: 'block',
                textAlign: 'inherit',
                border: '1px solid rgba(201,168,76,0.22)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(250,247,242,0.95))',
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid rgba(201,168,76,0.18)',
                    mb: 0.55,
                    background: '#f4ede2',
                }}
            >
                <Box
                    component="img"
                    src={representativeFace.previewUrl}
                    alt="פנים מייצגות"
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: `${posX}% ${posY}%`,
                        transform: 'scale(1.32)',
                        display: 'block',
                    }}
                />
            </Box>

            <Typography sx={{ color: '#2C1810', fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2 }}>
                אדם שזוהה
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: '#7A5C3A', fontSize: '0.68rem', lineHeight: 1.15, ml: 0.1 }}>
                {person.photoCount} תמונות
            </Typography>
        </ButtonBase>
    );
}
