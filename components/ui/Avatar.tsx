
import React from 'react';
import { User, AnimalType } from '../../types';
import { ANIMAL_PATHS } from '../../constants';

interface AvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ user, size = 'md', className = '', onClick, selected }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const animalKey = (user.animal && ANIMAL_PATHS[user.animal]) ? user.animal : 'bird';
  const animal = ANIMAL_PATHS[animalKey];

  return (
    <div 
      onClick={onClick}
      className={`relative rounded-full overflow-hidden flex items-center justify-center transition-all duration-300
        ${sizeClasses[size]} 
        ${selected ? 'ring-4 ring-offset-2 ring-stone-400 bg-stone-200' : 'bg-stone-100'}
        ${className}
        ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
      `}
      style={{ backgroundColor: selected ? undefined : '#f5f0e6' }}
    >
      {user.customAvatar ? (
        <img src={user.customAvatar} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <svg 
          viewBox={animal.viewBox} 
          className="w-[70%] h-[70%]"
          fill={animal.color}
        >
          <path d={animal.path} />
        </svg>
      )}
    </div>
  );
};

export default Avatar;
