"use client";

import React, { FC } from "react";

const Avatar: FC<{ username: string; url?: string }> = ({ username, url }) => {
  return url ? (
    <img src={url} alt={`${username} avatar`} className="modal-avatar-img" />
  ) : (
    <span className="modal-avatar-fallback">{username[0].toUpperCase()}</span>
  );
};

export default Avatar;

